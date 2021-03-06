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
    console.log('start')
    this.startIndex = startIndex || 0;
    this.endIndex = endIndex || this.steps.length - 1;
    this.looping = looping || false;
    this.resume();
  }

  pause() {
    this.playing = false;
    clearInterval(this.clock);
    this.clock = null;
  }

  resume() {
    this.startIndex = this.startIndex || 0;
    this.endIndex = this.endIndex || this.steps.length - 1;
    this.looping = this.looping || false;
    this.playing = true;
    this._scheduleNextSteps();
    this.clock = setInterval(
      () => this._scheduleNextSteps(), this.CLOCK_INTERVAL * 1000);
  }

  reset() {
    this.pause();
    this.previous = null;
  }

  setIterationStep(index) {
    if (index > 0) {
      const step = this.steps[index];
      const prev = this.steps[index - 1];
      const clockTime = this.audioContext.currentTime;
      const distance = Fraction.minus(step.position, prev.position);
      const timeDelta = distance.realValue * this.wholeNoteLength
      const time = this._round(clockTime - timeDelta) + this.INIT_DELAY;
      this.previous = { index: index - 1, step: prev, time: time }
    } else {
      this.reset();
      this.resume();
    }
  }

  setRange(range) {
    this.startIndex = range[0];
    this.endIndex = range[1];
  }

  /*
   * Voice entries contain no start time information which makes
   * placing them on the timeline a bit tricky. The algorithm used here 
   * relies on the sequence being perfectly dense, i.e. every note or rest
   * is immediately followed by another one (think of a voice as a sequence
   * of symbols, like characters in a string). So each time we add a note
   * to a step we prepare an empty step right after that note (several such steps
   * may be created during one invocation if the current step contains notes
   * of different lengths). On the next invocation, we simply take
   * the earliest empty step and know that's where the current voice entries
   * belong. One side effect is that once the complete score is loaded,
   * we have an extra empty step at the end which doesn't bother anyone
   * and it's actually useful when looping at the end of the score.
   */
  loadNotes(currentVoiceEntries) {
    let step = this.steps.find(s => s.notes.length === 0) ||
      this._getOrCreateStep(new Fraction(0, 1));
    for (let entry of currentVoiceEntries) {
      for (let note of entry.notes) {
        step.notes.push(note);
        this._getOrCreateStep(Fraction.plus(step.position, note.length));
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
      let stepTime = clockTime;
      let stepIndex = this.startIndex;
      if (this.previous) {
        const nextIndex = this.previous.index + 1;
        const length = Fraction.minus(
          this.steps[nextIndex].position, this.previous.step.position);
        stepTime = this._round(
          this.previous.time + length.realValue * this.wholeNoteLength);
        const endReached = nextIndex === this.endIndex;
        if (endReached && !this.looping) break;
        stepIndex = endReached ? this.startIndex : nextIndex;
      }
      if (stepTime >= horizon) break;
      const step = this.steps[stepIndex];
      const delay = this._round(stepTime - clockTime);
      const stopping = !this.looping && stepIndex === this.endIndex - 1;
      if (delay < 0) console.warn(`Missed step ${stepIndex} by ${-delay}ms`);
      if (delay >= 0 || stopping) { // send stop signal even if late
        this.notePlaybackCallback(Math.max(0, delay), step.notes, stepIndex, stopping);
      }
      this.previous = { step: step, index: stepIndex, time: stepTime }
    }
  }
  
  _round(num) {
    return Math.round((num + Number.EPSILON) * 1000) / 1000
  }
}
