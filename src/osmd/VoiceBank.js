import Soundfont from 'soundfont-player';
import VoiceConfig from './VoiceConfig';

export default class VoiceBank {
  constructor(audioContext) {
    this.DEFAULT_INSTRUMENT_ID = 'acoustic_grand_piano';

    this.audioContext = audioContext;
    
    this.parts = [];
    this.voices = {};
    this.instruments = {};
  }

  init(sheet) {
    let parts = [];
    let voices = {};
    
    for (let p of sheet.Parts) {
      let part = {
        name: p.Name,
        id: p.id,
        voices: []
      }
      parts.push(part);
      for (let v of p.Voices) {
        let voiceId = this._getVoiceId(v);
        let voice = new VoiceConfig(voiceId, this.DEFAULT_INSTRUMENT_ID);
        part.voices.push(voice);
        voices[voiceId] = voice;
      }
    }

    this.parts = parts;
    this.voices = voices;
    this.loadInstruments();
  }

  createNoteBatch() {
    return {};
  }

  addNoteToBatch(batch, note, duration) {
    let voice = this.voices[this._getVoiceId(note.voiceEntry.parentVoice)];
    let instrumentId = voice.instrumentId;
    if (!batch[instrumentId]) batch[instrumentId] = [];
    batch[instrumentId].push({
      note: voice.getNotePitch(note),
      duration: duration,
      gain: voice.volume
    });
  }

  scheduleNoteBatch(batch, targetTime, postPlayCallback) {
    for (let instrumentId of Object.keys(batch)) {
      let notes = batch[instrumentId];
      let instrument = this.instruments[instrumentId];
      let events = instrument.schedule(targetTime, notes);
      if (postPlayCallback) this._doAfterEvents(instrument, events, postPlayCallback);
    }
  }

  async setInstrument(voice, id) {
    await this.loadInstrument(id);
    voice.instrumentId = id;
  }

  async loadInstrument(id) {
    if (!this.instruments[id]) {
      this.instruments[id] = await Soundfont.instrument(this.audioContext, id);
    }
  }

  async loadInstruments() {
    let voiceIds = Object.keys(this.voices);
    let instrumentIds = new Set(voiceIds.map(id => this.voices[id].instrumentId));
    instrumentIds.forEach(async id => await this.loadInstrument(id));
  }

  stopInstruments() {
    Object.keys(this.instruments).forEach(k => this.instruments[k].stop());
  }

  _getVoiceId(osmdVoice) {
    return `${osmdVoice.parent.id}.${osmdVoice.VoiceId}`;
  }

  _doAfterEvents(instrument, events, callback) {
    let pending = events.length;
    instrument.onended = (when, obj, opts) => {
      if (events.indexOf(opts) > -1 && --pending === 0) {
        instrument.onended = null;
        callback();
      }
    };
  }
}