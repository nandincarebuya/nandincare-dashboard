export function formatMNT(amount) {
  return '\u20AE' + Number(amount).toLocaleString()
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('mn-MN', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Ulaanbaatar'
  })
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('mn-MN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: 'Asia/Ulaanbaatar'
  })
}

export function statusColor(status) {
  const colors = {
    pending_payment: 'bg-gray-100 text-gray-700',
    booked: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    checked_in: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    showed: 'bg-green-100 text-green-800',
    no_show: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

export function statusLabel(status) {
  const labels = {
    pending_payment: '\u0425\u04AF\u043B\u044D\u044D\u0433\u0434\u044D\u0436 \u0431\u0443\u0439',
    booked: '\u0422\u04E9\u043B\u0441\u04E9\u043D',
    confirmed: '\u0411\u0430\u0442\u0430\u043B\u0441\u0430\u043D',
    checked_in: '\u0418\u0440\u0441\u044D\u043D',
    completed: '\u0414\u0443\u0443\u0441\u0441\u0430\u043D',
    showed: '\u0418\u0440\u0441\u044D\u043D',
    no_show: '\u0418\u0440\u044D\u044D\u0433\u04AF\u0439',
    cancelled: '\u0426\u0443\u0446\u0430\u043B\u0441\u0430\u043D',
  }
  return labels[status] || status
}
