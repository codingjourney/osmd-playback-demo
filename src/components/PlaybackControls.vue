<template>
  <v-toolbar
    v-if="this.playbackEngine && this.playbackEngine.iterationSteps > 0">
    <v-label>Position</v-label>
    <v-slider
      :value="this.playbackEngine.currentIterationStep"
      :min="this.playbackEngine.startStep"
      :max="this.playbackEngine.stopStep"
      :step="1"
      @input="val => this.playbackEngine.jumpToStep(val)"
      thumb-label="true"
      class="progress-slider"
    ></v-slider>
    <v-btn
      icon
      @click="
        playbackEngine.state === 'PAUSED'
          ? playbackEngine.resume()
          : playbackEngine.play()
      "
      v-if="playbackEngine.state !== 'PLAYING'"
    >
      <v-icon dark>play_arrow</v-icon>
    </v-btn>
    <v-btn v-else icon @click="playbackEngine.pause()">
      <v-icon dark>pause</v-icon>
    </v-btn>
    <v-btn icon @click="playbackEngine.stop()">
      <v-icon dark>stop</v-icon>
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
