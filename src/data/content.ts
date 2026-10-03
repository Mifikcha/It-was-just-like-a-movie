export const links = {
  telegram: "https://t.me/Skifcha",
  hnd: "https://mifikcha.github.io/Acheba/",
  vk: "https://vk.ru/mifikcha",
  phone: "tel:+79397050642",
};

export const quotes = {
  // quotes stay in the original English (marked lang="en" in the markup)
  possibility: {
    text: "Things do not happen.\nThings are made to happen.",
    author: "John F. Kennedy",
  },
  work: {
    text: "Genius is one percent inspiration and ninety-nine percent perspiration.",
    author: "Thomas Edison",
  },
  decision: {
    text: "However difficult life may seem, there is always something you can do and succeed at.",
    author: "Stephen Hawking",
  },
};

export const subjects = ["Физика", "Математика", "Информатика"];

// ---------------------------------------------------------------- evidence: anonymised trajectories
// Students are never named on the site: every case is a "module" of the structure.
export type Trajectory = {
  unit: string;
  exam: string;
  subjects: string;
  start: string;
  task: string;
  work: string;
  result: string;
  highlight: string; // short result line for the archive
  brief: string; // short start line for the archive
};

export const trajectories: Trajectory[] = [
  {
    unit: "01",
    exam: "ОГЭ",
    subjects: "математика",
    start:
      "Профессиональная спортсменка: годы тренировок и соревнований высокого уровня. Математикой долго практически не занималась — большие пробелы в базовой арифметике, дробях и отрицательных числах.",
    task: "Не «натаскивать на ОГЭ» с первого занятия, а сначала собрать фундамент, без которого экзаменационные задания постоянно разваливаются.",
    work: "Восстанавливали арифметику, постепенно переходили к типовым заданиям ОГЭ и учились работать стабильно — без провалов на простых вычислениях.",
    result: "ОГЭ по математике — 4. Поступление в колледж без вступительных испытаний благодаря хорошему аттестату.",
    highlight: "ОГЭ — 4 · колледж без вступительных",
    brief: "Профессиональный спорт, большие пробелы в арифметике.",
  },
  {
    unit: "02",
    exam: "ЕГЭ",
    subjects: "математика",
    start:
      "Материал понимал быстро, но не хватало регулярности. Уже пробовал вторую часть, однако результат портили невнимательность и ошибки в простых местах.",
    task: "Превратить отдельные сильные решения в стабильный экзаменационный результат.",
    work: "Систематизировали базу, много практики и разбора ошибок, нормальный рабочий ритм вместо надежды «разберусь на экзамене».",
    result: "Стал заметно дисциплинированнее в подготовке и поступил в МИРЭА.",
    highlight: "МИРЭА",
    brief: "Понимал быстро, но не хватало регулярности.",
  },
  {
    unit: "03",
    exam: "ЕГЭ",
    subjects: "три предмета",
    start:
      "Сильная база, но мало времени. Вторая часть проработана слабее первой, больше всего вопросов — по физике. Подготовка сразу по трём предметам.",
    task: "За ограниченное время найти, где работа даст максимальную отдачу, и не распыляться.",
    work: "Высокий темп, много часов в неделю, приоритет слабым темам и второй части; по физике — закрывали самые опасные пробелы.",
    result: "Поступил в МГУ, Высшую школу управления и инноваций.",
    highlight: "МГУ · Высшая школа управления и инноваций",
    brief: "Сильная база, мало времени, три предмета сразу.",
  },
  {
    unit: "04",
    exam: "ОГЭ → ЕГЭ",
    subjects: "три учебных года",
    start:
      "Начали в 9 классе и прошли вместе три учебных года. Параллельно — серьёзные занятия танцами, свободного времени часто было немного.",
    task: "Выстроить подготовку, которая выдерживает плотный график и не превращается в постоянную гонку перед экзаменами.",
    work: "Длинный цикл: без ежемесячного «спасения ситуации», с постепенным прохождением программы, возвратом к слабым местам и нагрузкой под реальный график.",
    result: "Путь от ОГЭ до ЕГЭ. Поступил в МТУСИ.",
    highlight: "ОГЭ → ЕГЭ за три года · МТУСИ",
    brief: "9 класс, танцы и плотный график.",
  },
  {
    unit: "05",
    exam: "ЕГЭ",
    subjects: "математика, физика",
    start: "Начали в 10 классе. Математика, физика, школа, экзамены — плотный и тяжёлый режим.",
    task: "Не просто пройти программу, а удержать высокий уровень сразу по нескольким предметам на длинной дистанции.",
    work: "Два года системной подготовки: теория, большой объём практики, возвращение к ошибкам и постепенное усложнение задач.",
    result: "Лучший результат школы по сумме экзаменов — 265 баллов. Поступила в НИУ МГСУ.",
    highlight: "265 баллов · лучший результат школы · НИУ МГСУ",
    brief: "10 класс, два профильных предмета.",
  },
  {
    unit: "06",
    exam: "ОГЭ → ЕГЭ",
    subjects: "три предмета",
    start: "Начинали практически с базового уровня сразу по трём предметам.",
    task: "Не закрыть отдельные пробелы, а построить всю систему знаний — от основ до уровня ЕГЭ.",
    work: "База, экзаменационные темы, затем сложные задачи: длинный маршрут, где новое опиралось на уже построенное.",
    result: "Прошёл весь путь от начального уровня до ЕГЭ и поступил в МЭИ.",
    highlight: "от базового уровня до ЕГЭ · МЭИ",
    brief: "Почти с нуля по трём предметам.",
  },
  {
    unit: "07",
    exam: "ЕГЭ",
    subjects: "математика, информатика",
    start: "Математика сильнее, информатика заметно отставала. Сильная сторона — работоспособность и готовность заниматься регулярно.",
    task: "Подтянуть информатику до уровня математики и довести оба предмета до уверенного результата.",
    work: "Полный маршрут подготовки, много решённых задач; информатику закрыли, не потеряв уровень по математике.",
    result: "88 баллов по математике, 79 по информатике — один из лучших результатов школы. Поступил в МИРЭА, куда и хотел.",
    highlight: "математика 88 · информатика 79 · МИРЭА",
    brief: "Информатика заметно отставала от математики.",
  },
];

// Screenshots of messages from students and parents (names redacted).
export const reviewShots = Array.from({ length: 11 }, (_, i) => `evidence/review-${String(i + 1).padStart(2, "0")}.webp`);

// ---------------------------------------------------------------- scene 04: three full stories
export type Story = {
  unit: string;
  title: string;
  exam: string;
  span: string;
  lead: string;
  chapters: { label: string; text: string }[];
  figure: { value: string; caption: string };
  quote?: { text: string; source: string };
};

export const stories: Story[] = [
  {
    unit: "01",
    title: "Сначала фундамент",
    exam: "ОГЭ · математика",
    span: "подготовка к ОГЭ",
    lead: "Спорт высокого уровня занимал почти всё время. Математика годами оставалась на обочине — и на экзаменационных задачах это сразу было видно.",
    chapters: [
      { label: "Старт", text: "Большие пробелы в арифметике, дробях и отрицательных числах. Любое задание ОГЭ разваливалось на простом вычислении." },
      { label: "Решение", text: "Не гнаться за вариантами. Сначала вернуть основу, без которой экзамен не собрать: действия с числами, дроби, знаки." },
      { label: "Работа", text: "Постепенный переход к типовым заданиям ОГЭ. Главная цель — стабильность: чтобы простые места перестали быть ловушкой." },
      { label: "Итог", text: "ОГЭ по математике — 4. Хороший аттестат дал поступление в колледж без вступительных испытаний. После экзаменов был сделан выбор в пользу учёбы и будущей профессии." },
    ],
    figure: { value: "4", caption: "ОГЭ по математике" },
    quote: {
      text: "Вы нам очень помогли не только в учёбе, но и в психологическом состоянии, в моральном плане.",
      source: "из сообщения родителя",
    },
  },
  {
    unit: "04",
    title: "Маршрут длиной в три года",
    exam: "ОГЭ → ЕГЭ",
    span: "с 9 по 11 класс",
    lead: "Серьёзные занятия танцами и плотный график. Подготовка, которая должна была выдержать не месяц, а три учебных года.",
    chapters: [
      { label: "Старт", text: "9 класс, впереди ОГЭ, а за ним — ЕГЭ. Свободного времени немного: танцы занимают серьёзную часть недели." },
      { label: "Решение", text: "Длинный цикл вместо рывков: без необходимости каждый месяц «спасать ситуацию» и без гонки перед каждым экзаменом." },
      { label: "Работа", text: "Программа проходилась постепенно, к слабым местам возвращались снова, нагрузка подстраивалась под реальный график." },
      { label: "Итог", text: "Путь от ОГЭ до ЕГЭ пройден вместе. Поступление в МТУСИ — на инженерное направление, связанное с безопасной разработкой программ." },
    ],
    figure: { value: "3", caption: "учебных года одним маршрутом" },
    quote: {
      text: "Я думаю, что он нашёл в вас не просто учителя, но и наставника, друга, товарища.",
      source: "из сообщения родителя",
    },
  },
  {
    unit: "05",
    title: "Высокий уровень на длинной дистанции",
    exam: "ЕГЭ · математика, физика",
    span: "10–11 класс",
    lead: "Два предмета на высоком уровне, школа и экзамены одновременно. Задача была не «сдать», а удержать планку два года подряд.",
    chapters: [
      { label: "Старт", text: "10 класс. Профильная математика и физика, школа — плотный и тяжёлый режим." },
      { label: "Решение", text: "Два года системной подготовки: теория, большой объём практики, постоянное возвращение к ошибкам." },
      { label: "Работа", text: "Задачи постепенно усложнялись, к ошибкам возвращались до тех пор, пока они не переставали повторяться." },
      { label: "Итог", text: "Сумма 265 баллов — лучший результат в школе. Поступление в НИУ МГСУ." },
    ],
    figure: { value: "265", caption: "баллов · лучший результат школы" },
  },
];

// ---------------------------------------------------------------- scene 05: work (Edison) — the control loop
// Five stages of one learning cycle. The loop is drawn in frame space of the work flight's last frame (1920×1080)
// as a tilted orbit across the service sector; stages sit at even fractions of it, starting top-left.
export const controlLoop = {
  centre: { x: 1335, y: 545 },
  rx: 395,
  ry: 290,
  tilt: -14,
  stages: [
    { id: "diag", n: "01", label: "Диагностика", verb: "измерить" },
    { id: "plan", n: "02", label: "План", verb: "выбрать шаг" },
    { id: "practice", n: "03", label: "Практика", verb: "сделать" },
    { id: "check", n: "04", label: "Проверка", verb: "сравнить" },
    { id: "fix", n: "05", label: "Коррекция", verb: "перестроить" },
  ],
};

// What the system reacts to over seven cycles. `cycle` is 1-based; the signal is measured at `from`
// and answered at `to` (a lower `to` than `from` means the answer lands on the next cycle's stage).
export const controlEvents = [
  { cycle: 1, from: 0, to: 1, signal: "Входная диагностика", response: "маршрут собран" },
  { cycle: 1, from: 2, to: 3, signal: "Занятие завершено", response: "отчёт ученику и родителю" },
  { cycle: 2, from: 3, to: 4, signal: "Ошибка повторилась 3 раза", response: "тема возвращена в маршрут" },
  { cycle: 3, from: 0, to: 1, signal: "Пробник просел по теме", response: "маршрут перестроен" },
  { cycle: 4, from: 2, to: 3, signal: "ДЗ не сдано в срок", response: "напоминание ученику и родителю" },
  { cycle: 5, from: 3, to: 4, signal: "ДЗ стабильно закрывается", response: "сложность повышена" },
  { cycle: 6, from: 3, to: 4, signal: "Тема решена без ошибок", response: "узел закрыт" },
  { cycle: 7, from: 0, to: 1, signal: "Повторный пробник", response: "фокус сдвинут дальше" },
];
export const controlCycles = 7;

// ---------------------------------------------------------------- scene 06: one knowledge map, personal routes
// Frame space of the knowledge flight's last frame (1920×1080): the sphere is the student, the map surrounds it.
export type MapNode = { id: string; label: string; x: number; y: number; kind: "hub" | "topic" | "work"; anchor: "l" | "r" | "t" | "b" };
export const knowledgeMap = {
  centreXY: { x: 742, y: 510 },
  shellRadius: 160,
  nodes: [
    { id: "M", label: "Математика", x: 742, y: 262, kind: "hub", anchor: "t" },
    { id: "P", label: "Физика", x: 470, y: 612, kind: "hub", anchor: "l" },
    { id: "C", label: "Информатика", x: 1012, y: 612, kind: "hub", anchor: "r" },
    { id: "m1", label: "Выражения", x: 560, y: 318, kind: "topic", anchor: "l" },
    { id: "m2", label: "Уравнения", x: 470, y: 222, kind: "topic", anchor: "l" },
    { id: "m3", label: "Функции и графики", x: 625, y: 168, kind: "topic", anchor: "t" },
    { id: "m4", label: "Производная", x: 850, y: 168, kind: "topic", anchor: "t" },
    { id: "m5", label: "Геометрия", x: 1015, y: 222, kind: "topic", anchor: "r" },
    { id: "m6", label: "Вероятность", x: 935, y: 318, kind: "topic", anchor: "r" },
    { id: "p1", label: "Кинематика", x: 365, y: 400, kind: "topic", anchor: "l" },
    { id: "p2", label: "Динамика", x: 305, y: 540, kind: "topic", anchor: "l" },
    { id: "p3", label: "Законы сохранения", x: 320, y: 690, kind: "topic", anchor: "b" },
    { id: "p4", label: "Электричество", x: 395, y: 820, kind: "topic", anchor: "l" },
    { id: "p5", label: "Магнетизм", x: 525, y: 895, kind: "topic", anchor: "b" },
    { id: "p6", label: "Оптика", x: 660, y: 948, kind: "topic", anchor: "b" },
    { id: "c1", label: "Системы счисления", x: 1150, y: 418, kind: "topic", anchor: "t" },
    { id: "c2", label: "Логика", x: 1225, y: 560, kind: "topic", anchor: "r" },
    { id: "c3", label: "Python", x: 1205, y: 712, kind: "topic", anchor: "r" },
    { id: "c4", label: "Алгоритмы", x: 1115, y: 840, kind: "topic", anchor: "r" },
    { id: "c5", label: "Рекурсия и ДП", x: 985, y: 905, kind: "topic", anchor: "b" },
    { id: "w1", label: "Исследовательский проект", x: 830, y: 958, kind: "work", anchor: "b" },
  ] as MapNode[],
  // hub → topic belongs to the subject; cross links are where subjects lean on each other
  links: [
    ["M", "m1"], ["M", "m2"], ["M", "m3"], ["M", "m4"], ["M", "m5"], ["M", "m6"],
    ["P", "p1"], ["P", "p2"], ["P", "p3"], ["P", "p4"], ["P", "p5"], ["P", "p6"],
    ["C", "c1"], ["C", "c2"], ["C", "c3"], ["C", "c4"], ["C", "c5"],
    ["m2", "m1"], ["m3", "m2"], ["m4", "m3"], ["m6", "m5"], ["p1", "p2"], ["p2", "p3"], ["p4", "p5"], ["p5", "p6"],
    ["c1", "c2"], ["c3", "c4"], ["c4", "c5"],
    ["m4", "p1"], ["m3", "p1"], ["m2", "p2"], ["m1", "c1"], ["m6", "c4"], ["c3", "w1"], ["p3", "w1"], ["c5", "w1"],
  ] as [string, string][],
};

// One example student (not a real one). Only three things are lit on the map: what is studied now,
// where errors repeat, and what comes next. `route` is the faint path already walked through the map.
export const studentRoute = {
  route: ["c1", "c2", "c3", "c4"],
  focus: "c4",
  weak: "c2",
  next: "c5",
  lines: [
    { key: "focus", term: "Сейчас", value: "алгоритмы" },
    { key: "weak", term: "Слабое место", value: "логика" },
    { key: "next", term: "Дальше", value: "рекурсия и ДП" },
  ],
};

// ---------------------------------------------------------------- scene 07: subjects mapped onto the structure
// Numbers come from the Hopes and Dreams repository (github.com/Mifikcha/Acheba), "Звездный набор" programmes.
export const programLadder = ["Базовый набор · ОГЭ", "Джентльменский набор · ЕГЭ до 80", "Звёздный набор · ЕГЭ на 100"];

export const subjectModes = [
  {
    id: "physics",
    title: "Физика",
    tint: "#ffb56b",
    exam: "ЕГЭ",
    // Unique images embedded in Публичный сайт/Физика: 424.
    specs: [
      { value: "45", label: "тем программы" },
      { value: "36", label: "теоретических модулей" },
      { value: "28", label: "разборов экзаменационных задач" },
      { value: "420+", label: "схем, графиков и иллюстраций" },
    ],
  },
  {
    id: "math",
    title: "Математика",
    tint: "#b69cff",
    exam: "ЕГЭ",
    // Unique images (99) + Desmos graphs (75) in Публичный сайт/Математика.
    specs: [
      { value: "41", label: "тема программы" },
      { value: "41", label: "теоретический модуль" },
      { value: "23", label: "разбора экзаменационных задач" },
      { value: "170+", label: "схем и живых графиков Desmos" },
    ],
  },
  {
    id: "cs",
    title: "Информатика",
    tint: "#7dcfff",
    exam: "ЕГЭ",
    // Unique images embedded in Публичный сайт/Информатика: 326.
    specs: [
      { value: "64", label: "урока авторского курса по информатике «Истинный фундамент»" },
      { value: "100", label: "задач-«звёзд»: творческие задачи для закрепления навыков, с автопроверкой" },
      { value: "26", label: "разборов экзаменационных задач" },
      { value: "320+", label: "схем, диаграмм и иллюстраций" },
    ],
  },
];
export const subjectTools = ["Desmos", "симуляции", "Python с автопроверкой", "граф знаний", "отчёты", "режим фокуса"];

// Hopes and Dreams at a glance (scene 07 footer).
export const platformFacts = [
  { value: "9", label: "программ: три предмета × три уровня" },
  { value: "431", label: "страница учебных материалов" },
  { value: "1000+", label: "схем и иллюстраций" },
  { value: "77", label: "разборов экзаменационных задач" },
];

// ---------------------------------------------------------------- scene 08: human layer
export const author = {
  name: "Сергей Беззубин",
  role: "Преподаватель физики, математики и информатики, автор среды Hopes and Dreams",
  bio: [
    "Физик по первому образованию, инженер машинного обучения по второму. Сейчас учусь в аспирантуре, экономика.",
    "Строю подготовку так же, как строят сложные системы: от диагностики начального состояния и исследования проблемы до разработки полного маршрута решения и достижения результата.",
    "Hopes and Dreams являет собой место, где 3 технических предмета объединяются в единую, стройную систему, которая позволяет не только подготовиться к экзаменам, но и сформировать целостное техническое мышление: понимать закономерности, строить модели и переносить методы из одной области в другую.",
  ],
  facts: [
    "Бакалавриат, физика — УрФУ, 2024",
    "Магистратура с отличием, информатика и вычислительная техника — УрФУ, 2026",
    "Научная деятельность и преподавание (аспирантура)",
  ],
  // in the order the author chose: lecture, lobby, podium; `pos` keeps the face inside the portrait crop
  photos: [
    { src: "author/photo-1.webp", alt: "Сергей Беззубин объясняет задачу о движении тела, брошенного под углом", pos: "40% 30%" },
    { src: "author/photo-2.webp", alt: "Сергей Беззубин в лобби университета", pos: "40% 30%" },
    { src: "author/photo-3.webp", alt: "Сергей Беззубин выступает с докладом", pos: "60% 30%" },
  ],
  diplomas: [
    { src: "author/diploma-bachelor.webp", title: "Диплом бакалавра", note: "Физика · УрФУ · 2024" },
    { src: "author/diploma-master.webp", title: "Диплом магистра с отличием", note: "Информатика и вычислительная техника · УрФУ · 2026" },
  ],
  publications: [
    {
      title: "Predicting parameters of a model cuprate superconductor using machine learning",
      topic: "Машинное обучение (U-Net) восстанавливает параметры модели купратного высокотемпературного сверхпроводника по его фазовой диаграмме",
      venue: "Computational Materials Science, т. 268, 114621 · Elsevier, 2026 · соавтор",
      href: "https://doi.org/10.1016/j.commatsci.2026.114621",
    },
  ],
};

// ---------------------------------------------------------------- scene 09: formats = degree of support
export const formats = [
  {
    level: "01",
    title: "Навигация",
    price: "3 000 ₽",
    unit: "в месяц",
    fine: "не за час — за месяц: 1 час раз в две недели",
    includes: ["занятие раз в две недели", "проверка домашних заданий"],
    note: "Основная работа — самостоятельная, преподаватель задаёт курс и проверяет, что он держится.",
  },
  {
    level: "02",
    title: "Мини-группа",
    price: "1 500 ₽",
    unit: "за час",
    fine: "",
    includes: ["2–3 человека", "занятия по общему маршруту", "разбор ошибок каждого"],
    note: "Темп группы и внимание к каждому: маленький состав, чтобы никто не терялся.",
  },
  {
    level: "03",
    title: "Индивидуально",
    price: "2 500 ₽",
    unit: "за час",
    fine: "",
    includes: ["маршрут под одного ученика", "работа со слабыми местами", "полное сопровождение до экзамена"],
    note: "Максимальная степень сопровождения: вся подготовка строится вокруг одной задачи.",
  },
];

// ---------------------------------------------------------------- scene 10: ready-made first messages for Telegram
export const messageTemplates = [
  { label: "Ученику", text: "Здравствуйте! Я в [класс] классе, готовлюсь к [ОГЭ / ЕГЭ] по [предмет]. Цель — [баллы или задача]. Подскажите, с чего начать?" },
  { label: "Родителю", text: "Здравствуйте! Я родитель ученика [класс] класса. Хотим обсудить подготовку к [ОГЭ / ЕГЭ] по [предмет] и подобрать формат занятий." },
];

// Scroll journey through the megastructure. `progress` = construction_progress shown in that scene.
export const journey = [
  { id: "hero", index: "01", title: "Возможность", progress: 0.42 },
  { id: "approach", index: "02", title: "Модуль среды", progress: 0.45 },
  { id: "evidence", index: "03", title: "Доказательства", progress: 0.5 },
  { id: "stories", index: "04", title: "Истории", progress: 0.55 },
  { id: "work", index: "05", title: "Работа", progress: 0.62 },
  { id: "knowledge", index: "06", title: "Карта знаний", progress: 0.72 },
  { id: "subjects", index: "07", title: "Предметы", progress: 0.8 },
  { id: "human", index: "08", title: "Человек", progress: 0.88 },
  { id: "formats", index: "09", title: "Форматы", progress: 0.95 },
  { id: "final", index: "10", title: "Следующий шаг", progress: 1 },
] as const;

// What the final sequence shows between construction_progress 0.45 and 1.0.
export const constructionStages = [
  { at: 0.45, label: "Несущие фермы достроены" },
  { at: 0.52, label: "Вторичный каркас" },
  { at: 0.6, label: "Поля коллекторов заполняются" },
  { at: 0.68, label: "Сервисные модули подключены" },
  { at: 0.75, label: "Логистические кольца активны" },
  { at: 0.82, label: "Финальные секторы оболочки" },
  { at: 0.88, label: "Временные фермы демонтируются" },
  { at: 0.93, label: "Сервисный свет включён" },
  { at: 1, label: "Оболочка цельная" },
];
