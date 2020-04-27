<template>
  <v-toolbar>
    <v-range-slider
      :min="0"
      :max="this.playbackEngine.iterationSteps"
      :step="1"
      :value="[this.playbackEngine.startStep, this.playbackEngine.stopStep]"
      @input="val => this.playbackEngine.setRange(val)"
      class="progress-slider"
    ></v-range-slider>
    <!-- v-btn-toggle -->
      <v-btn v-if="playbackEngine.looping === false"
        icon @click="playbackEngine.toggleLooping()">
        <v-icon dark>keyboard_tab</v-icon>
      </v-btn>
      <v-btn v-else icon @click="playbackEngine.toggleLooping()">
        <v-icon dark>replay</v-icon>
      </v-btn>
    <!-- /v-btn-toggle -->
    <v-btn icon @click="playbackEngine.restoreFullRange()">
      <v-icon dark>settings_ethernet</v-icon>
    </v-btn>
  </v-toolbar>
</template>

<script>
export default {
  props: {
    playbackEngine: Object
  }
};
</script>

<style lang="scss">
</style>
