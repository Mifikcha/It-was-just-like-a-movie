export type Result = {
  label: string;
  before: string;
  after: string;
  note: string;
};

export type Review = {
  body: string;
  author: string;
  relationship: string;
  result?: string;
  audio?: string;
  transcript?: string;
};

export type StudentCase = {
  start: string;
  problem: string;
  method: string;
  result: string;
};

export const links = {
  telegram: "https://t.me/Skifcha",
  hnd: "https://mifikcha.github.io/Acheba/",
  vk: "https://vk.ru/mifikcha",
  phone: "tel:+79397050642",
};

export const quotes = {
  possibility: {
    text: "Things do not happen. Things are made to happen.",
    author: "John F. Kennedy",
  },
  work: {
    text: "Genius is one percent inspiration and ninety-nine per cent perspiration.",
    author: "Thomas Edison",
  },
  decision: {
    text: "However difficult life may seem, there is always something you can do and succeed at.",
    author: "Stephen Hawking",
  },
};

export const results: Result[] = [
  {
    label: "Результат ученика",
    before: "[START]",
    after: "[RESULT]",
    note: "[RESULT DATA REQUIRED]",
  },
  {
    label: "Экзамен / поступление",
    before: "[START]",
    after: "[RESULT]",
    note: "[RESULT DATA REQUIRED]",
  },
];

export const reviews: Review[] = [
  {
    body: "[REAL REVIEW REQUIRED]",
    author: "[AUTHOR REQUIRED]",
    relationship: "ученик / родитель",
    result: "[OPTIONAL RESULT]",
  },
];

export const studentCases: StudentCase[] = [
  {
    start: "[START DATA REQUIRED]",
    problem: "[PROBLEM DATA REQUIRED]",
    method: "[METHOD DATA REQUIRED]",
    result: "[RESULT DATA REQUIRED]",
  },
  {
    start: "[START DATA REQUIRED]",
    problem: "[PROBLEM DATA REQUIRED]",
    method: "[METHOD DATA REQUIRED]",
    result: "[RESULT DATA REQUIRED]",
  },
];

export const diplomas = [
  { title: "Бакалавриат", status: "[DIPLOMA IMAGE REQUIRED]" },
  { title: "Магистратура с отличием", status: "[DIPLOMA IMAGE REQUIRED]" },
];

export const formats = [
  {
    level: "Самостоятельно",
    description: "Доступ к Hopes and Dreams без постоянного участия преподавателя.",
    includes: ["Среда", "Материалы", "Инструменты"],
  },
  {
    level: "С сопровождением",
    description: "Группа или пара: маршрут, занятия и регулярная обратная связь.",
    includes: ["Группы", "Пары", "Диагностика"],
  },
  {
    level: "Персонально",
    description: "Индивидуальные занятия, консультации и точечная работа со слабыми местами.",
    includes: ["1:1", "Консультации", "Пробные работы"],
  },
];

export const subjects = ["Физика", "Математика", "Информатика"];
