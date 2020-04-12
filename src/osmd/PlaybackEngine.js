import PlaybackScheduler from './PlaybackScheduler';
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
    this.denominator = null;

    this.scheduler = null;

    this.iterationSteps = 0;
    this.currentIterationStep = 0;

    this.timeoutHandles = [];

    this.bpm = this.defaultBpm;
    this.voiceBank = new VoiceBank(this.ac);

    this.state = playbackStates.INIT;
  }

  get wholeNoteLength() {
    return Math.round((60 / this.bpm) * this.denominator * 1000);
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

    this.scheduler = new PlaybackScheduler(
      this.denominator, this.wholeNoteLength, this.ac,
      (delay, notes, finishing) => this._notePlaybackCallback(delay, notes, finishing)
    );
    this._countAndSetIterationSteps();
  }

  async play() {
    await this.voiceBank.loadInstruments();
    await this.ac.resume();

    this.cursor.show();

    this.state = playbackStates.PLAYING;
    this.scheduler.start();
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

  _countAndSetIterationSteps() {
    this.cursor.reset();
    let steps = 0;
    while (!this.cursor.iterator.endReached) {
      if (this.cursor.iterator.currentVoiceEntries)
        this.scheduler.loadNotes(this.cursor.iterator.currentVoiceEntries);
      this.cursor.next();
      ++steps;
    }
    this.iterationSteps = steps;
    this.cursor.reset();
  }

  _notePlaybackCallback(audioDelay, notes, finishing) {
    if (this.state !== playbackStates.PLAYING) return;
    let batch = this.voiceBank.createNoteBatch();

    for (let note of notes) {
      let noteDuration = this._getNoteDuration(note);
      if (noteDuration !== 0) this.voiceBank.addNoteToBatch(batch, note, noteDuration);
    }
    let targetTime = this.ac.currentTime + audioDelay;
    let postPlayCallback = finishing ? (() => this.stop()) : undefined;
    this.voiceBank.scheduleNoteBatch(batch, targetTime, postPlayCallback);

    this.timeoutHandles.push(
      setTimeout(() => this._iterationCallback(), Math.max(0, audioDelay * 1000 - 40))
    ); // Subtracting 40 milliseconds to compensate for update delay
  }

  // Used to avoid duplicate cursor movements after a rapid pause/resume action
  _clearTimeouts() {
    for (let h of this.timeoutHandles) {
      clearTimeout(h);
    }
    this.timeoutHandles = [];
  }

  _iterationCallback() {
    if (this.state !== playbackStates.PLAYING) return;
    if (this.currentIterationStep > 0) this.cursor.next();
    ++this.currentIterationStep;
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
    return duration / 1000; // seconds instead of ms
  }
}
