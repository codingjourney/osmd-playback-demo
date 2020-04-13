import StepQueue from './StepQueue';

export default class PlaybackScheduler {
  denominator;     // beats per whole note
  wholeNoteLength; // milliseconds
  stepQueue = new StepQueue();
  stepQueueIndex = 0;
  scheduledTicks = new Set(); // timing positions whose notes have already been scheduled
                              // but which haven't yet elapsed

  currentTick = 0; // tick count from start of playback to most recent scheduling invocation
  currentTickTimestamp = 0; // AC time at most recent scheduling invocation

  _audioContextStartTime = 0; // AC time at start of playback, seconds

  _schedulerInterval = null;
  _scheduleInterval = 200; // periodicity of scheduling invocations, milliseconds
  _schedulePeriod = 1500;  // scheduling horizon, milliseconds
  _tickDenominator = 1024; // ticks per whole note

  _lastTickOffset = 300; // Hack to get the initial notes play better

  playing = false;

  _loaderFutureTicks = new Set(); // timing positions for notes yet to be loaded (see loadNotes())

  constructor(denominator, wholeNoteLength, audioContext, noteSchedulingCallback) {
    this.noteSchedulingCallback = noteSchedulingCallback;
    this.denominator = denominator;
    this.wholeNoteLength = wholeNoteLength;
    this.audioContext = audioContext;
  }

  get schedulePeriodTicks() { // scheduling horizon, ticks
    return this._schedulePeriod / this.tickDuration;
  }

  get audioContextTime() { // AC time elapsed since start of playback, milliseconds
    if (!this.audioContext) return 0;
    return (this.audioContext.currentTime - this._audioContextStartTime) * 1000;
  }

  get _calculatedTick() { // tick count since most recent scheduling invocation added to its tick count
    return (
      this.currentTick + Math.round((this.audioContextTime - this.currentTickTimestamp) / this.tickDuration)
    );
  }

  get tickDuration() { // milliseconds (effectively scheduling precision)
    return this.wholeNoteLength / this._tickDenominator;
  }

  start() {
    this.playing = true;
    this.stepQueue.sort();
    console.log('AudioContext time: ', this.audioContextTime);
    console.log('Tick duration: ', this.tickDuration);
    this._audioContextStartTime = this.audioContext.currentTime;
    this.currentTickTimestamp = this.audioContextTime;
    if (!this._schedulerInterval) {
      this._schedulerInterval = setInterval(() => this._scheduleIterationStep(), this._scheduleInterval);
    }
  }

  setIterationStep(step) {
    step = Math.min(this.stepQueue.steps.length - 1, step);
    this.stepQueueIndex = step;
    this.currentTick = this.stepQueue.steps[this.stepQueueIndex].tick;
  }

  pause() {
    this.playing = false;
  }

  resume() {
    this.playing = true;
    this.currentTickTimestamp = this.audioContextTime;
  }

  reset() {
    this.playing = false;
    this.currentTick = 0;
    this.currentTickTimestamp = 0;
    this.stepQueueIndex = 0;
    clearInterval(this._schedulerInterval);
    this._schedulerInterval = null;
  }

  loadNotes(currentVoiceEntries) {
    /*
     * Voice entries contain no start time information which makes
     * placing them on the timeline a bit tricky. The algorithm used here 
     * relies on the sequence being perfectly dense, i.e. every note or rest
     * is immediately followed by another one (think of a voice as a sequence
     * of symbols, like characters in a string). As we process voice entries,
     * we keep track of all upcoming end-times. The earliest end-time will be
     * the start-time when this method is next invoked. The list of upcoming
     * end-times is called _loaderFutureTicks.
     */
    let thisTick = this._lastTickOffset;
    if (this.stepQueue.steps.length > 0) {
      thisTick = Math.min(...this._loaderFutureTicks);
    }

    for (let entry of currentVoiceEntries) {
      for (let note of entry.notes) {
        this._loaderFutureTicks.add(thisTick + note.length.realValue * this._tickDenominator);
        let step = { tick: thisTick };
        this.stepQueue.add(step, note);
      }
    }

    for (let tick of this._loaderFutureTicks) {
      if (tick <= thisTick) this._loaderFutureTicks.delete(tick);
    }
  }

  _scheduleIterationStep() {
    if (!this.playing) return;
    this.currentTick = this._calculatedTick;
    this.currentTickTimestamp = this.audioContextTime;

    let nextTick = this.stepQueue.steps[this.stepQueueIndex]
      ? this.stepQueue.steps[this.stepQueueIndex].tick
      : undefined;
    while (
      nextTick &&
      (nextTick - this.currentTick) * this.tickDuration <= this._schedulePeriod
    ) {
      let step = this.stepQueue.steps[this.stepQueueIndex];
      let isLastStep = this.stepQueueIndex === this.stepQueue.steps.length - 1

      let timeToTick = (step.tick - this.currentTick) * this.tickDuration;
      if (timeToTick < 0) timeToTick = 0;

      this.scheduledTicks.add(step.tick);
      this.noteSchedulingCallback(timeToTick / 1000, step.notes, isLastStep);

      this.stepQueueIndex++;
      nextTick = this.stepQueue.steps[this.stepQueueIndex]
        ? this.stepQueue.steps[this.stepQueueIndex].tick
        : undefined;
    }

    for (let tick of this.scheduledTicks) {
      if (tick <= this.currentTick) {
        this.scheduledTicks.delete(tick);
      }
    }
  }
}
