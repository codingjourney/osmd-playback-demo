import PlaybackEngine from '@/osmd/PlaybackEngine.js'
import { IXmlElement, MusicSheetReader } from 'opensheetmusicdisplay'

const sheetStr = require('fs').readFileSync(`${__dirname}/test01.xml`)
const sheetDoc = new DOMParser().parseFromString(sheetStr, "application/xml")
const sheetElm = new IXmlElement(sheetDoc.childNodes[1])
const sheet = new MusicSheetReader().createMusicSheet(sheetElm, "test")

class FakeCursor {
  constructor() { this.reset() }
  reset() { this.iterator = sheet.musicPartManager.getIterator() }
  next() { this.iterator.moveToNext() }
  show() {}
  hide() {}
}

class FakeInstrument {
  schedule() {}
  stop() {}
}

const audio = require("web-audio-mock-api")
const engine = new PlaybackEngine(new audio.AudioContext())

describe('PlaybackEngine state transitions', () => {
  it('void    -> INIT', () => {
    expect(engine.state).toBe('INIT')
  })
  it('INIT    -> PLAYING', async () => {
    engine.init(sheet, new FakeCursor(), new FakeInstrument())
    await engine.play()
    expect(engine.state).toBe('PLAYING')
  })
  it('PLAYING -> PAUSED', () => {
    engine.pause()
    expect(engine.state).toBe('PAUSED')
  })
  it('PAUSED  -> PLAYING', () => {
    engine.resume()
    expect(engine.state).toBe('PLAYING')
  })
  it('PLAYING -> STOPPED', async () => {
    await engine.stop()
    expect(engine.state).toBe('STOPPED')
  })
  it('STOPPED -> PLAYING', async () => {
    await engine.play()
    expect(engine.state).toBe('PLAYING')
  })
  it('PLAYING -> PAUSED', () => {
    engine.pause()
    expect(engine.state).toBe('PAUSED')
  })
  it('PAUSED  -> STOPPED', async () => {
    await engine.stop()
    expect(engine.state).toBe('STOPPED')
  })
})
