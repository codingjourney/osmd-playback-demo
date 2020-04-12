<template>
  <div class="playback-sidebar">
    <div class="sidebar-content">
      <h2 class="mt-5">Anleitung</h2>
      <p>
        Lied auswählen, Stimmen anpassen, abspielen, wiederholen :-)
      </p>
      <h2>
        Tempo
        {{
          playbackEngine.denominator ? `(1/${playbackEngine.denominator})` : ""
        }}
      </h2>
      <BpmSlider
        :bpm="playbackEngine.bpm"
        @update:bpm="val => playbackEngine.setBpm(val)"
        :disabled="bpmDisabled"
      ></BpmSlider>
      <h2>Stimmen</h2>
      <PartControl
        v-for="part in parts"
        :key="part.id"
        :part="part"
        :voiceBank="playbackEngine.voiceBank"
      />
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
import PartControl from "./PartControl.vue";
import BpmSlider from "./BpmSlider";
import instruments from "../instruments";

export default {
  components: {
    BpmSlider,
    PartControl
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
    parts() {
      return this.playbackEngine.voiceBank.parts;
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
