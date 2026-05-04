// Service Worker - 处理 Web Push 通知
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || '💊 小派提醒', {
      body: data.body,
      icon: data.icon || '/icons/pill-192.png',
      badge: data.badge || '/icons/badge-72.png',
      tag: 'pillpal-reminder',
      renotify: true,
      data: data.data || {}
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      clients.openWindow(url)
    })
  )
})
