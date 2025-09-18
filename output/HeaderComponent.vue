<template>
  <header :class="'header-main'">
    <nav :class="'nav-container'">
      <a href="/" :class="'logo'" />
      <ul :class="'nav-menu'">
        <li>
          <a href="/" :class="'nav-link'" />
        </li>
        <li>
          <a href="/about" :class="'nav-link'" />
        </li>
        <li>
          <a href="/services" :class="'nav-link'" />
        </li>
        <li>
          <a href="/contact" :class="'nav-link'" />
        </li>
      </ul>
    </nav>
  </header>
</template>

<script>
export default {
  name: 'HeaderComponent',
  data() {
    return {
      // Component data
    };
  },
};
</script>

<style scoped>

</style>