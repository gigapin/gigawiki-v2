// Apply the saved preference before styles and React load to avoid a theme flash.
try {
  const theme = localStorage.getItem('gigawiki-theme') === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
} catch {
  document.documentElement.dataset.theme = 'dark'
  document.documentElement.style.colorScheme = 'dark'
}
