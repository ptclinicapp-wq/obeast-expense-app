export const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const nowIso = () => new Date().toISOString();

export const localDateTime = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

export const toIsoFromLocalInput = (value: string) =>
  value ? new Date(value).toISOString() : nowIso();

export const toLocalInputValue = (value?: string | null) =>
  localDateTime(value ? new Date(value) : new Date());

export const monthKey = (date = new Date()) => localDateTime(date).slice(0, 7);

export const transactionMonthKey = (datetime: string) =>
  localDateTime(new Date(datetime)).slice(0, 7);

export const formatDateTime = (datetime: string) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(datetime));

export const formatDate = (datetime: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(datetime));
