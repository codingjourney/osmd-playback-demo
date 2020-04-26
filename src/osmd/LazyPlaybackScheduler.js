import { Fraction } from "opensheetmusicdisplay";

/**
 * A scheduler answers two basic questions: which step should be played next
 * and when exactly that should happen (a step is a set of notes/rests with
 * the same position in the score). This implementation remembers which step
 * it scheduled most recently and what AudioContext timestamp it was assigned
 * (both values are stored in the 'previous' object). All other values
 * are calculated as needed; hence 'Lazy' in the name. Partial playback
 * and looping are supported - see start().
 */
export default class LazyPlaybackScheduler {

  INIT_DELAY         = 0.100; // seconds
  CLOCK_INTERVAL     = 0.200; // seconds
  SCHEDULED_INTERVAL = 0.400; // seconds
  
  steps = [];
  startIndex;
  endIndex;
  wholeNoteLength; // seconds
  
  playing = false;
  looping = false;
  previous = null;
  
  audioContext;
  notePlaybackCallback;
  clock;

  constructor(denominator, wholeNoteLength, audioContext, notePlaybackCallback) {
    this.wholeNoteLength = wholeNoteLength;
    this.audioContext = audioContext;
    this.notePlaybackCallback = notePlaybackCallback;
  }

  start(startIndex, endIndex, looping) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    this.looping = looping;
    this.resume();
  }

  pause() {
    this._pauseAt(this.previous.index);
  }

  resume() {
    this.playing = true;
    this._scheduleNextSteps();
    this.clock = setInterval(
      () => this._scheduleNextSteps(), this.CLOCK_INTERVAL * 1000);
  }

  reset() {
    this._pauseAt(null);
    this.previous = null;
  }

  setIterationStep(index) {
    
  }

  /*
   * Voice entries contain no start time information which makes
   * placing them on the timeline a bit tricky. The algorithm used here 
   * relies on the sequence being perfectly dense, i.e. every note or rest
   * is immediately followed by another one (think of a voice as a sequence
   * of symbols, like characters in a string). So each time we add a note
   * to a step we prepare an empty step right after it (several such steps
   * may be created during one invocation if the current step contains notes
   * of different lengths). On the next invocation, we simply take
   * the earliest empty step and know that's where the current voice entries
   * belong. One side effect is that once the complete score is loaded,
   * we have an extra empty step at the end which doesn't bother anyone.
   */
  loadNotes(currentVoiceEntries) {
    let step = this.steps.find(s => s.notes.length === 0) ||
      this._getOrCreateStep(new Fraction(0, 1));
    for (let entry of currentVoiceEntries) {
      for (let note of entry.notes) {
        step.notes.push(note);
        this._getOrCreateStep(Fraction.plus(step.position, note.length));
        if (!step.length || step.length.gt(note.length)) {
          step.length = note.length; // step's shortest note length
        }
      }
    }
    this.steps.sort((a, b) => a.position.CompareTo(b.position));
  }

  _getOrCreateStep(position) {
    let step = this.steps.find(s => s.position.Equals(position));
    if (!step) {
      step = { position: position, notes: [] };
      this.steps.push(step);
    }
    return step;
  }

  _scheduleNextSteps() {
    if (!this.playing) return;
    const clockTime = this._round(this.audioContext.currentTime);
    const horizon = this._round(clockTime + this.SCHEDULED_INTERVAL);
    while (true) {
      let stepIndex = this.startIndex;
      let stepTime = clockTime;
      if (this.previous) {
        stepIndex = this.previous.index + 1;
        if (stepIndex === this.endIndex) {
          if (!this.looping) break;
          else stepIndex = this.startIndex;
        }
        const stepLength = this.previous.step.length.realValue * this.wholeNoteLength;
        stepTime = this._round(this.previous.time + stepLength);
      }
      if (stepTime >= horizon) break;
      const step = this.steps[stepIndex];
      const delay = this._round(stepTime - clockTime);
      const stopping = !this.looping && stepIndex === this.endIndex - 1;
      if (delay < 0) console.warn(`Missed step ${stepIndex}!`);
      if (delay >= 0 || stopping) { // send stop signal even if late
        this.notePlaybackCallback(Math.max(0, delay), step.notes, stopping, stepIndex);
      }
      this.previous = { step: step, index: stepIndex, time: stepTime }
    }
  }
  
  _pauseAt(stepIndex) {
    this.playing = false;
    clearInterval(this.clock);
    this.clock = null;
  }
  
  _round(num) {
    return Math.round((num + Number.EPSILON) * 1000) / 1000
  }
}