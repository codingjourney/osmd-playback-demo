<template>
  <div class="playback-sidebar">
    <div class="sidebar-content">
      <h2 class="mt-5">Anleitung</h2>
      <p>
        Lied auswählen, Einstellungen anpassen, abspielen.
      </p>
      <h2>
        Tempo
        {{
          playbackEngine.denominator ? `(1/${playbackEngine.denominator})` : ""
        }}
      </h2>
      <BpmSlider
        :bpm="playbackEngine.playbackSettings.bpm"
        @update:bpm="val => playbackEngine.setBpm(val)"
        :disabled="bpmDisabled"
      ></BpmSlider>
      <h2>Lautstärke</h2>
      <InstrumentControl
        v-for="instrument in instrumentLevels"
        :key="instrument.id"
        :playbackEngine="playbackEngine"
        :instrument="instrument"
      />
      <h2>Instrument</h2>
      <v-select
        class="mb-4"
        value="acoustic_grand_piano"
        :items="instruments"
        @change="i => playbackEngine.loadInstrument(i)"
      ></v-select>
      <h2 class="mt-5">Info</h2>
      <p>
        Basiert auf 
        <a href="https://github.com/jimutt/osmd-playback-demo">Jimmy's Audio Player</a> von
        <a href="https://twitter.com/jimutt">Jimmy Utterström</a>. Adaptiert von Jan Hustak.
      </p>
    </div>
  </div>
</template>

<script>
import InstrumentControl from "./InstrumentControl.vue";
import BpmSlider from "./BpmSlider";
import instruments from "../instruments";

export default {
  components: {
    InstrumentControl,
    BpmSlider
  },
  props: {
    playbackEngine: Object
  },
  data() {
    return {
      instruments: instruments
    };
  },
  computed: {
    instrumentLevels() {
      return this.playbackEngine.playbackSettings.volumes.instruments;
    },
    bpmDisabled() {
      return this.playbackEngine.state === "PLAYING";
    }
  }
};
</script>

<style lang="scss">
.playback-sidebar {
  padding: 20px;
}
</style>
