import LazyPlaybackScheduler from '@/osmd/LazyPlaybackScheduler'
import { IXmlElement, MusicSheetReader, Pitch } from 'opensheetmusicdisplay'

jest.useFakeTimers()
const audioContext = { currentTime: 0 }
const playback = jest.fn()
const [scheduler, sheetSteps] = init('test02.xml', audioContext, playback)
// note durations: 3/8, 1/8, 1/8, 1/8 rest, 1/8, 1/8 rest, 8/8

describe('initial state', () => {
  it('has one more step than the sheet', () => {
    expect(scheduler.steps.length).toBe(sheetSteps + 1)
  })
  it('has an extra step with no notes', () => {
    expect(scheduler.steps[sheetSteps].notes.length).toBe(0)
  })
})

describe('complete playback', () => {
  it('schedules step 0 right away, sets up interval', () => {
    scheduler.wholeNoteLength = 1 // steps: 0, 0.375, 0.5, 0.625, 0.75, 0.875, 1
    scheduler.start(
      /* startPosition */ 0,
      /* endPosition   */ sheetSteps,
      /* loop          */ false)
    expect(scheduledSteps()).toBe('C5 in 0s')
    expect(setInterval).toHaveBeenCalled()
    expect(setInterval.mock.calls[0][1]).toBe(scheduler.CLOCK_INTERVAL * 1000);
  })
  it(`schedules steps with less than ${scheduler.SCHEDULED_INTERVAL}s lead`, () => {
    expect(tick().result).toBe('0.1s: -')
    expect(tick().result).toBe('0.2s: D5 in 0.175s')
    expect(tick().result).toBe('0.3s: -')
    expect(tick().result).toBe('0.4s: E5 in 0.1s')
    expect(tick().result).toBe('0.5s: R in 0.125s')
    expect(tick().result).toBe('0.6s: C5 in 0.15s')
    expect(tick().result).toBe('0.7s: R in 0.175s')
    expect(tick().result).toBe('0.8s: -')
    expect(tick().result).toBe('0.9s: G5+G4+E4 in 0.1s and STOP')
  })
  it('omits empty step due at 2s', () => {
    for (let i = 1; i <= 2; i += 0.1) {
      expect(tick().result).toBe(`${round(i)}s: -`)
    }
  })
})

describe('accelerated playback', () => {
  it('schedules steps 0 and 1 right away', () => {
    reset(scheduler)
    scheduler.wholeNoteLength = 0.4 // steps: 0, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4
    scheduler.start(0, sheetSteps, false)
    expect(scheduledSteps()).toBe('C5 in 0s; D5 in 0.15s')
  })
  it(`schedules steps with less than ${scheduler.SCHEDULED_INTERVAL}s lead`, () => {
    expect(tick().result).toBe('0.1s: E5 in 0.1s; R in 0.15s')
    expect(tick().result).toBe('0.2s: C5 in 0.1s; R in 0.15s')
    expect(tick().result).toBe('0.3s: G5+G4+E4 in 0.1s and STOP')
  })
})

describe('partial playback - steps 1 through 4', () => {
  it('starts with step 1 (startPosition)', () => {
    reset(scheduler)
    scheduler.wholeNoteLength = 1 // steps: 0, 0.375, 0.5, 0.625, 0.75, 0.875, 1
    scheduler.start(1, 5, false)
    expect(scheduledSteps()).toBe('D5 in 0s; E5 in 0.125s')
  })
  it('stops with step 4 (endPosition - 1)', () => {
    expect(tick().result).toBe('0.1s: R in 0.15s')
    expect(tick().result).toBe('0.2s: C5 in 0.175s and STOP')
  })
})

describe('pause and resume', () => {
  it('shuts down the clock on pause', () => {
    reset(scheduler)
    scheduler.wholeNoteLength = 0.8 // steps: 0, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8
    scheduler.start(0, sheetSteps, false)
    expect(tick().result).toBe('0.1s: -')
    expect(tick().result).toBe('0.2s: D5 in 0.1s')
    expect(tick().result).toBe('0.3s: E5 in 0.1s')
    expect(tick().result).toBe('0.4s: R in 0.1s')
    scheduler.pause()
    expect(scheduler.clock).toBeNull()
  })
  it('resumes playback right after the last scheduled step', () => {
    playback.mockClear()
    scheduler.resume()
    expect(scheduledSteps()).toBe('-') // still at 0.4; 0.5 is already scheduled
    expect(tick().result).toBe('0.5s: C5 in 0.1s')
    expect(tick().result).toBe('0.6s: R in 0.1s')
    expect(tick().result).toBe('0.7s: G5+G4+E4 in 0.1s and STOP')
  })
})

describe('looping', () => {
  it('starts over at the end', () => {
    reset(scheduler)
    scheduler.wholeNoteLength = 0.4 // steps: 0, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4
    scheduler.start(0, sheetSteps, true)
    expect(scheduledSteps()).toBe('C5 in 0s; D5 in 0.15s')
    for (let i = 0; i < 10; i++) {
      expect(tick().result).toBe(`${round(0.8 * i + 0.1)}s: E5 in 0.1s; R in 0.15s`)
      expect(tick().result).toBe(`${round(0.8 * i + 0.2)}s: C5 in 0.1s; R in 0.15s`)
      expect(tick().result).toBe(`${round(0.8 * i + 0.3)}s: G5+G4+E4 in 0.1s`)
      expect(tick().result).toBe(`${round(0.8 * i + 0.4)}s: -`)
      expect(tick().result).toBe(`${round(0.8 * i + 0.5)}s: -`)
      expect(tick().result).toBe(`${round(0.8 * i + 0.6)}s: -`)
      expect(tick().result).toBe(`${round(0.8 * i + 0.7)}s: C5 in 0.1s`)  // scheduling start of new loop
      expect(tick().result).toBe(`${round(0.8 * i + 0.8)}s: D5 in 0.15s`) // C5 is now playing...
    }
  })
})

describe('handling of interleaving notes', () => {
  it('schedules based on positions rather than note lengths', () => {
    const [scheduler, sheetSteps] = init('test03.xml', audioContext, playback)
    reset(scheduler)
    scheduler.wholeNoteLength = 0.4
    // voice 1 steps: 0, 0.1, 0.3, 0.4 (tie), 0.5, 0.6
    // voice 2 steps: 0, 0.2, 0.4, 0.6
    scheduler.start(0, sheetSteps, false)
    expect(scheduledSteps()).toBe('C5+E4 in 0s; D5 in 0.1s')
    expect(tick().result).toBe('0.1s: F4 in 0.1s')
    expect(tick().result).toBe('0.2s: E5 in 0.1s')
    expect(tick().result).toBe('0.3s: E5+G4 in 0.1s')
    expect(tick().result).toBe('0.4s: R in 0.1s')
    expect(tick().result).toBe('0.5s: C5+E4 in 0.1s and STOP')
  })
})

// describe('change of tempo during playback', () => {})

function init(testFile, audioContext, playback) {
  const scheduler = new LazyPlaybackScheduler(4, 1, audioContext, playback)
  scheduler.INIT_DELAY = 0
  scheduler.CLOCK_INTERVAL = 0.1
  scheduler.SCHEDULED_INTERVAL = 0.2

  const sheetStr = require('fs').readFileSync(`${__dirname}/${testFile}`)
  const sheetDoc = new DOMParser().parseFromString(sheetStr, "application/xml")
  const sheetElm = new IXmlElement(sheetDoc.childNodes[1])
  const sheet = new MusicSheetReader().createMusicSheet(sheetElm, "test")
  
  let i = sheet.musicPartManager.getIterator()
  let sheetSteps = 0
  while (!i.endReached) {
    if (i.currentVoiceEntries) {
      scheduler.loadNotes(i.currentVoiceEntries)
      sheetSteps++
    }
    i.moveToNext()
  }

  return [scheduler, sheetSteps]
}

function tick() {
  const calls = playback.mock.calls
  const upToNow = calls.length

  audioContext.currentTime += scheduler.CLOCK_INTERVAL
  jest.advanceTimersByTime(scheduler.CLOCK_INTERVAL * 1000)

  const time = round(audioContext.currentTime)
  const steps = scheduledSteps(calls.slice(upToNow))
  return { result: `${time}s: ${steps}`, steps: `${steps}` }
}

function reset(scheduler) {
  scheduler.reset()
  playback.mockClear()
  jest.clearAllTimers()
  jest.useFakeTimers()
  audioContext.currentTime = 0
}

function scheduledSteps(playbackCalls) {
  let calls = playbackCalls || playback.mock.calls
  let stepsPerCall = []
  for (const call of calls) {
    const notes = call[1].map(n => {
      if (n.pitch) {
        const noteStr = 'C D EF G A B'[n.pitch.fundamentalNote]
        const octave = n.pitch.octave + Pitch.octXmlDiff
        return noteStr + octave
      } else {
        return 'R'
      }
    })
    const delay = round(call[0])
    const stopFlag = call[2] ? ' and STOP' : ''
    stepsPerCall.push(`${notes.join('+')} in ${delay}s${stopFlag}`)
  }
  return stepsPerCall.join('; ') || '-'
}

function round(num) {
  return Math.round((num + Number.EPSILON) * 1000) / 1000
}
