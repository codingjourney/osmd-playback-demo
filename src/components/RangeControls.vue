<template>
  <v-toolbar
    v-if="this.playbackEngine && this.playbackEngine.iterationSteps > 0">
    <v-label>Umfang</v-label>
    <v-range-slider
      :min="0"
      :max="this.playbackEngine.iterationSteps"
      :step="1"
      :value="[this.playbackEngine.startStep, this.playbackEngine.stopStep]"
      @input="val => this.playbackEngine.setRange(val)"
      thumb-label="true"
      class="progress-slider"
    ></v-range-slider>
    <v-tooltip top>
      <template v-slot:activator="{ on }">
        <v-btn v-if="playbackEngine.looping === false" icon v-on="on"
           @click="playbackEngine.setLooping(true)">
          <v-icon dark>keyboard_tab</v-icon>
        </v-btn>
      <v-btn v-else icon v-on="on"
        @click="playbackEngine.setLooping(false)">
        <v-icon dark>replay</v-icon>
      </v-btn>
      </template>
      <span>{{ this.playbackEngine.loopingStateDescription }}</span>
    </v-tooltip>
    <v-tooltip top>
      <template v-slot:activator="{ on }">
        <v-btn icon v-on="on"
           @click="playbackEngine.restoreFullRange()">
          <v-icon dark>settings_ethernet</v-icon>
        </v-btn>
      </template>
      <span>Umfang zurücksetzen</span>
    </v-tooltip>
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
