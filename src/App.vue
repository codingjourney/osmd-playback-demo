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
    <v-list flat>
      <v-toolbar>
        <v-toolbar-side-icon @click="drawer = !drawer">
          <v-icon>keyboard_arrow_{{drawer ? "left" : "right"}}</v-icon>
        </v-toolbar-side-icon>
        <v-select :items="scores" :value="selectedScore" label="Lied auswählen" @change="scoreChanged" />
      </v-toolbar>
      <RangeControls :playbackEngine="pbEngine" />
      <PlaybackControls :playbackEngine="pbEngine" :drawer="drawer" />
    </v-list>
  </v-toolbar>
  <v-content>
    <v-container fluid style="padding-top: 10em">
      <Score @osmdInit="osmdInit" @scoreLoaded="scoreLoaded"  :score="selectedScore"/>
    </v-container>
  </v-content>
</v-app>
</template>

<script>
import PlaybackSidebar from "./components/PlaybackSidebar";
import PlaybackControls from "./components/PlaybackControls.vue";
import RangeControls from "./components/RangeControls.vue";
import Score from "./components/Score";

import scores from "./scores";

import PlaybackEngine from "./osmd/PlaybackEngine";

export default {
  name: "app",
  components: {
    osmd: null,
    Score,
    PlaybackSidebar,
    PlaybackControls,
    RangeControls
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
.progress-slider { padding: 0 1em 0 1em }
// centers progress slider vertically within the toolbar
.progress-slider .v-input__control { flex-direction: inherit; flex-wrap: inherit }
.progress-slider .v-input__slot { margin-bottom: inherit }
</style>
