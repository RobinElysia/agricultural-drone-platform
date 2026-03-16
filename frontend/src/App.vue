<template>
  <div id="app-root">
    <div class="ambient ambient-a" />
    <div class="ambient ambient-b" />
    <router-view />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
#app-root {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.ambient {
  position: fixed;
  border-radius: 999px;
  filter: blur(90px);
  pointer-events: none;
  z-index: -1;
}

.ambient-a {
  width: 280px;
  height: 280px;
  left: -90px;
  top: 8vh;
  background: rgba(31, 157, 103, 0.28);
}

.ambient-b {
  width: 380px;
  height: 380px;
  right: -140px;
  bottom: -110px;
  background: rgba(209, 155, 45, 0.22);
}
</style>
