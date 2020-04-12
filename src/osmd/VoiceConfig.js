export default class VoiceConfig {

  constructor(voiceId, instrumentId, volume = 1, octaveShift = 0) {
    this.voiceId = voiceId;
    this.instrumentId = instrumentId;
    this.volume = volume;
    this.octaveShift = octaveShift;
  }

  getNotePitch(note) {
    let OCTAVE_ADJUSTMENT = 1; // work-around for OSMD issue #715
    let HALFTONES_PER_OCTAVE = 12;
    return note.halfTone + (this.octaveShift + OCTAVE_ADJUSTMENT) * HALFTONES_PER_OCTAVE;
  }
}