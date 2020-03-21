<template>
  <v-toolbar>
    <v-toolbar-side-icon @click="drawer = !drawer">
      <v-icon>keyboard_arrow_{{drawer ? "left" : "right"}}</v-icon>
    </v-toolbar-side-icon>
  </v-toolbar>
</template>

<script>
export default {
  props: {
    playbackEngine: Object,
    drawer: Boolean
  }
};
</script>

<style lang="scss">
</style>
