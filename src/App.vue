<template>
<v-app id="app">
  <v-navigation-drawer
    v-model="drawer"
    app>
    <v-list>
      <PlaybackSidebar :playbackEngine="pbEngine" />
    </v-list>
  </v-navigation-drawer>
  <v-toolbar app>
    <v-toolbar-side-icon @click="drawer = !drawer">
      <v-icon>keyboard_arrow_{{drawer ? "left" : "right"}}</v-icon>
    </v-toolbar-side-icon>
    <!-- TODO move the following components back into PlaybackControls -->
    <v-slider
      v-if="this.pbEngine && this.pbEngine.iterationSteps > 0"
      :value="this.pbEngine.currentIterationStep"
      :min="0"
      :max="this.pbEngine.iterationSteps"
      :step="1"
      @input="val => this.pbEngine.jumpToStep(val)"
      class="progress-slider"
    ></v-slider>
    <v-btn
      icon
      @click="
        pbEngine.state === 'PAUSED'
          ? pbEngine.resume()
          : pbEngine.play()
      "
      v-if="pbEngine.state !== 'PLAYING'"
    >
      <v-icon dark>play_arrow</v-icon>
    </v-btn>
    <v-btn v-else icon @click="pbEngine.pause()">
      <v-icon dark>pause</v-icon>
    </v-btn>
    <v-btn icon @click="pbEngine.stop()">
      <v-icon dark>stop</v-icon>
    </v-btn>
  </v-toolbar>
  <v-content>
    <v-container fluid>
      <v-select :items="scores" label="Lied auswählen" @change="scoreChanged" />
      <Score @osmdInit="osmdInit" @scoreLoaded="scoreLoaded"  :score="selectedScore"/>
    </v-container>
  </v-content>
</v-app>
</template>

<script>
import PlaybackSidebar from "./components/PlaybackSidebar";
import PlaybackControls from "./components/PlaybackControls.vue";
import Score from "./components/Score";

import scores from "./scores";

import PlaybackEngine from "./osmd/PlaybackEngine";

export default {
  name: "app",
  components: {
    osmd: null,
    Score,
    PlaybackSidebar,
    PlaybackControls
  },
  data() {
    return {
      pbEngine: new PlaybackEngine(),
      scores: scores,
      selectedScore: null,
      osmd: null,
      scoreTitle: "",
      drawer: true
    };
  },
  computed: {},
  methods: {
    osmdInit(osmd) {
      console.log("OSMD init");
      this.osmd = osmd;
      this.selectedScore = "Im_Fruehling.xml";
    },
    scoreLoaded() {
      console.log("Score loaded");
      if (this.osmd.sheet.title) this.scoreTitle = this.osmd.sheet.title.text;
      this.pbEngine.loadScore(this.osmd);
    },
    scoreChanged(scoreUrl) {
      if (this.pbEngine.state === "PLAYING") this.pbEngine.stop();
      this.selectedScore = scoreUrl;
    }
  }
};
</script>

<style lang="scss">
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
// centers progress slider vertically within the toolbar
.progress-slider .v-input__control { flex-direction: inherit; flex-wrap: inherit }
.progress-slider .v-input__slot { margin-bottom: inherit }
</style>
