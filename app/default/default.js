<script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js"></script>
<script>
window.addEventListener('load', function() {
  const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true
  });

  document.querySelectorAll('.bubble.markdown .md').forEach(el => {
    el.innerHTML = md.render(el.textContent.trim());
  });
});
</script>
