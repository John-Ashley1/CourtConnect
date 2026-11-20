export function greeting(name = '') {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name.trim().split(/\s+/)[0] || 'there'}.`
}
