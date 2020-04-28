import LazyPlaybackScheduler from './LazyPlaybackScheduler';
import VoiceBank from './VoiceBank';

const playbackStates = {
  INIT: 'INIT',
  PLAYING: 'PLAYING',
  STOPPED: 'STOPPED',
  PAUSED: 'PAUSED'
};

export default class PlaybackEngine {
  constructor(audioContext) {
    this.ac = audioContext || new AudioContext();
    this.ac.suspend();
    this.defaultBpm = 100;

    this.cursor = null;
    this.sheet = null;
    this.iterator = null;
    this.denominator = null;  // beats per whole note

    this.scheduler = null;

    this.iterationSteps = 0;
    this.currentIterationStep = 0;
    this.startStep = 0;
    this.stopStep = 0;
    this.looping = false;

    this.timeoutHandles = [];

    this.bpm = this.defaultBpm;
    this.voiceBank = new VoiceBank(this.ac);

    this.state = playbackStates.INIT;
  }

  get wholeNoteLength() { // seconds
    return (60 / this.bpm) * this.denominator;
  }

  get loopingStateDescription() { // TODO i18n
    return this.looping ? 'Wird ständig wiederholt' : 'Wird einmal durchgespielt';
  }

  loadScore(osmd) {
    this.init(osmd.sheet, osmd.cursor)
  }

  init(sheet, cursor) {
    this.sheet = sheet;
    this.cursor = cursor;
    this.denominator = this.sheet.playbackSettings.rhythm.denominator;
    if (this.sheet.HasBPMInfo) {
      this.setBpm(this.sheet.DefaultStartTempoInBpm);
    }

    this.voiceBank.init(sheet);

    this.scheduler = new LazyPlaybackScheduler(
      this.denominator, this.wholeNoteLength, this.ac,
      (delay, notes, stepIndex, stopping) =>
        this._notePlaybackCallback(delay, notes, stepIndex, stopping)
    );
    this._countAndSetIterationSteps();
  }

  async play() {
    await this.voiceBank.loadInstruments();
    await this.ac.resume();

    this.cursor.show();

    this.state = playbackStates.PLAYING;
    this.scheduler.start(this.startStep, this.stopStep, this.looping);
  }

  async stop() {
    this.state = playbackStates.STOPPED;
    this.voiceBank.stopInstruments();
    this._clearTimeouts();
    this.scheduler.reset();
    this.cursor.reset();
    this.currentIterationStep = 0;
    this.cursor.hide();
  }

  pause() {
    this.state = playbackStates.PAUSED;
    this.ac.suspend();
    this.voiceBank.stopInstruments();
    this.scheduler.setIterationStep(this.currentIterationStep);
    this.scheduler.pause();
    this._clearTimeouts();
  }

  resume() {
    this.state = playbackStates.PLAYING;
    this.scheduler.resume();
    this.ac.resume();
  }

  jumpToStep(step) {
    this.pause();
    console.log('Jump to step ' + step);
    if (this.currentIterationStep > step) {
      this.cursor.hide();
      this.cursor.reset();
      this.currentIterationStep = 0;
    }
    while (this.currentIterationStep < step) {
      this.cursor.next();
      ++this.currentIterationStep;
    }
    let schedulerStep = this.currentIterationStep;
    if (this.currentIterationStep > 0 && this.currentIterationStep < this.iterationSteps) ++schedulerStep;
    this.scheduler.setIterationStep(schedulerStep);
    this.cursor.show();
  }

  async setInstrument(voice, instrumentId) {
    await this.instrumentCache.load(this.ac, instrumentId);
    voice.instrumentId = instrumentId;
  }

  setBpm(bpm) {
    this.bpm = bpm;
    if (this.scheduler) this.scheduler.wholeNoteLength = this.wholeNoteLength;
  }

  setLooping(looping) {
    this.looping = looping;
    this.scheduler.looping = looping;
  }

  setRange(range) {
    this.startStep = range[0];
    this.stopStep = range[1];
    this.scheduler.setRange(range);
  }

  restoreFullRange() {
    this.startStep = 0;
    this.stopStep = this.iterationSteps;
  }

  _countAndSetIterationSteps() {
    this.cursor.reset();
    let steps = 0;
    while (!this.cursor.iterator.endReached) {
      if (this.cursor.iterator.currentVoiceEntries) {
        this.scheduler.loadNotes(this.cursor.iterator.currentVoiceEntries);
        ++steps;
      }
      this.cursor.next();
    }
    this.iterationSteps = steps;
    this.startStep = 0;
    this.stopStep = steps;
    this.cursor.reset();
  }

  _notePlaybackCallback(audioDelay, notes, stepIndex, stopping) {
    if (this.state !== playbackStates.PLAYING) return;
    let batch = this.voiceBank.createNoteBatch();

    for (let note of notes) {
      let noteDuration = this._getNoteDuration(note);
      if (noteDuration !== 0) this.voiceBank.addNoteToBatch(batch, note, noteDuration);
    }
    let targetTime = this.ac.currentTime + audioDelay;
    let postPlayCallback = stopping ? (() => this.stop()) : undefined;
    this.voiceBank.scheduleNoteBatch(batch, targetTime, postPlayCallback);

    this.timeoutHandles.push(
      setTimeout(
        () => this._iterationCallback(stepIndex),
        Math.max(0, audioDelay * 1000 - 40) // Subtracting 40ms to compensate for update delay
      )
    );
  }

  // Used to avoid duplicate cursor movements after a rapid pause/resume action
  _clearTimeouts() {
    for (let h of this.timeoutHandles) {
      clearTimeout(h);
    }
    this.timeoutHandles = [];
  }

  _iterationCallback(step) {
    if (this.state !== playbackStates.PLAYING) return;
    if (this.currentIterationStep > step) {
      console.log('Loop back to ' + step);
      this.cursor.hide();
      this.cursor.reset();
      this.currentIterationStep = 0;
    }
    while (this.currentIterationStep < step) {
      this.cursor.next();
      ++this.currentIterationStep;
    }
    this.cursor.show();
  }

  _getNoteDuration(note) {
    let duration = note.length.realValue * this.wholeNoteLength;
    if (note.NoteTie) {
      if (Object.is(note.NoteTie.StartNote, note) && note.NoteTie.notes[1]) {
        duration += note.NoteTie.notes[1].length.realValue * this.wholeNoteLength;
      } else {
        duration = 0;
      }
    }
    return duration;
  }
}
