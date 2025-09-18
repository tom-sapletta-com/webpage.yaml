<template>
  <header :class="'header-main'">
    <nav :class="'nav-container'">
      <a href="/" :class="'logo'">🎯 MyApp</a>
      <ul :class="'nav-menu'">
        <li>
          <a href="/" :class="'nav-link'">Home</a>
        </li>
        <li>
          <a href="/about" :class="'nav-link'">About</a>
        </li>
        <li>
          <a href="/services" :class="'nav-link'">Services</a>
        </li>
        <li>
          <a href="/contact" :class="'nav-link'">Contact</a>
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