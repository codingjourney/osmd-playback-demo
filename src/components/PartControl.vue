<template>
  <div>
    <h3>{{ part.name }}</h3>
    <div v-for="(voice, index) in part.voices" :key="index" class="voice-box">
      <v-select
        :value="voice.instrumentId"
        :items="instruments"
        @change="i => voiceBank.setInstrument(voice, i)"
      />
      <VolumeSlider :volume.sync="voice.volume" />
    </div>
  </div>
</template>

<script>
import VolumeSlider from "./VolumeSlider.vue";
import instruments from "../instruments";

export default {
  components: {
    VolumeSlider
  },
  props: ["voiceBank", "part"],
  data() {
    return {
      instruments: instruments
    };
  }
};
</script>

<style lang="css">
.voice-box {
  margin-bottom: 0.6em;
  padding: 0.4em;
  border: 3px solid #ddd;
  border-radius: 0.5em;
}
</style>