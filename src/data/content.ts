export const links = {
  telegram: "https://t.me/Skifcha",
  hnd: "https://mifikcha.github.io/Acheba_demo/",
  vk: "https://vk.ru/mifikcha",
  phone: "tel:+79397050642",
  // the contact form posts here (worker/lead-relay -> Telegram); empty until the worker is deployed
};

export const quotes = {
  // quotes stay in the original English (marked lang="en" in the markup)
  possibility: {
    text: "Things do not happen.\nThings are made to happen.",
    author: "John F. Kennedy",
    ru: "Ничто не случается само — всё приходится делать.",
  },
  work: {
    text: "Genius is one percent inspiration and ninety-nine percent perspiration.",
    author: "Thomas Edison",
    ru: "Гений — это один процент вдохновения и девяносто девять процентов труда.",
  },
  decision: {
    text: "However difficult life may seem, there is always something you can do and succeed at.",
    author: "Stephen Hawking",
    ru: "Какой бы трудной ни казалась жизнь, всегда есть то, что вы можете сделать и в чём добиться успеха.",
  },
};

export const subjects = ["Физика", "Математика", "Информатика"];

// ---------------------------------------------------------------- evidence: anonymised trajectories
// Students are never named on the site. Every fact below comes from the teacher's account of the case; the wording
// is plain on purpose. Strongest first: the site shows them in this order.
export type Trajectory = {
  unit: string;
  exam: string;
  subjects: string;
  title: string; // the circumstance that made it hard
  span?: string;
  start: string;
  task: string;
  work: string;
  result: string;
  highlight: string; // short result line for the archive
};

export const trajectories: Trajectory[] = [
  {
    unit: "03",
    exam: "ЕГЭ",
    subjects: "три предмета",
    title: "Три экзамена сразу и мало времени",
    start: "База была хорошая, но времени оставалось мало, а сдавать нужно было три предмета. Вторую часть он знал хуже первой, больше всего вопросов было по физике.",
    task: "Раз времени мало, тратить его только там, где прибавка будет самой большой.",
    work: "Занимались много часов в неделю. Сначала брали слабые темы и вторую часть, по физике закрывали самые опасные пробелы.",
    result: "Поступил в МГУ, в Высшую школу управления и инноваций.",
    highlight: "МГУ · Высшая школа управления и инноваций",
  },
  {
    unit: "08",
    exam: "ЕГЭ",
    subjects: "физика",
    title: "Сильный с самого начала и много работы",
    start: "Пришёл уже сильным. Много занимался и в школе, и со мной.",
    task: "Не сбавлять темп и довести физику до уровня, с которым поступают в технический вуз.",
    work: "Готовились к ЕГЭ по физике, объём работы был большой.",
    result: "Поступил в МГТУ им. Баумана на радиоэлектронику и лазерную технику, на специалитет.",
    highlight: "МГТУ им. Баумана · радиоэлектроника и лазерная техника",
  },
  {
    unit: "05",
    exam: "ЕГЭ",
    subjects: "математика, физика",
    title: "Два профильных предмета два года подряд",
    span: "10–11 класс",
    start: "Пришла в 10 классе. Профильная математика, физика и школа одновременно, режим был тяжёлый.",
    task: "Готовиться ровно все два года и держать уровень по обоим предметам.",
    work: "Теория и много практики. Задачи постепенно усложнялись, к ошибкам возвращались, пока они не переставали повторяться.",
    result: "265 баллов в сумме, лучший результат в школе. Поступила в НИУ МГСУ.",
    highlight: "265 баллов · лучший результат школы · НИУ МГСУ",
  },
  {
    unit: "07",
    exam: "ЕГЭ",
    subjects: "математика, информатика",
    title: "Информатика сильно отставала",
    start: "С математикой было неплохо, а информатика сильно отставала. Зато он был готов заниматься много и регулярно.",
    task: "Подтянуть информатику до уровня математики и при этом не просесть по математике.",
    work: "Прошли всю программу и решили очень много задач.",
    result: "Математика 88, информатика 79, один из лучших результатов в школе. Поступил в МИРЭА, куда и хотел.",
    highlight: "математика 88 · информатика 79 · МИРЭА",
  },
  {
    unit: "09",
    exam: "ЕГЭ",
    subjects: "",
    title: "Прошёл впритык, вторым с конца",
    start: "Очень умный парень со своим, непростым характером.",
    task: "Говорить с ним на равных.",
    work: "Занимались и много общались, не только про учёбу. Дружим до сих пор.",
    result: "Поступил в ИТМО на фотонику. Прошёл впритык, в списке был вторым с конца, но его взяли.",
    highlight: "ИТМО · фотоника",
  },
  {
    unit: "06",
    exam: "ОГЭ → ЕГЭ",
    subjects: "три предмета",
    title: "Почти с нуля, и сразу по трём предметам",
    start: "Начинали почти с базового уровня, причём сразу по трём предметам.",
    task: "Строить всё заново, от основ до уровня ЕГЭ.",
    work: "Сначала база, потом экзаменационные темы, потом сложные задачи. Каждая новая тема опиралась на то, что уже разобрали.",
    result: "Дошёл от начального уровня до ЕГЭ и поступил в МЭИ.",
    highlight: "от базового уровня до ЕГЭ · МЭИ",
  },
  {
    unit: "04",
    exam: "ОГЭ → ЕГЭ",
    subjects: "три учебных года",
    title: "Три года подготовки и серьёзные танцы",
    span: "с 9 по 11 класс",
    start: "Начали в 9 классе. Он серьёзно занимался танцами, свободного времени было мало.",
    task: "Растянуть подготовку на три года так, чтобы она укладывалась в его график и перед экзаменами не приходилось ничего нагонять.",
    work: "Шли по программе постепенно, к слабым местам возвращались, нагрузку подстраивали под танцы.",
    result: "Сдал ОГЭ, потом ЕГЭ и поступил в МТУСИ, на направление по безопасной разработке программ.",
    highlight: "ОГЭ → ЕГЭ за три года · МТУСИ",
  },
  {
    unit: "01",
    exam: "ОГЭ",
    subjects: "математика",
    title: "Профессиональный спорт и годы без математики",
    start: "Она профессионально занималась спортом, ездила на соревнования высокого уровня и математику годами почти не трогала. Арифметика, дроби и отрицательные числа давались с трудом, любое задание ОГЭ сыпалось на простом вычислении.",
    task: "Варианты ОГЭ пока отложить и сначала вернуть основу: действия с числами, дроби, знаки.",
    work: "Когда основа встала на место, перешли к типовым заданиям. Главное было перестать ошибаться в простых местах.",
    result: "ОГЭ по математике на 4. С хорошим аттестатом поступила в колледж без вступительных, а после экзаменов выбрала учёбу и будущую профессию.",
    highlight: "ОГЭ — 4 · колледж без вступительных",
  },
  {
    unit: "02",
    exam: "ЕГЭ",
    subjects: "математика",
    title: "Понимал быстро, но занимался урывками",
    start: "Схватывал материал быстро и уже пробовал вторую часть. Но занимался нерегулярно и терял баллы на невнимательности и ошибках в простых местах.",
    task: "Научить его решать стабильно, в любой день.",
    work: "Привели в порядок базу, много решали и разбирали ошибки. Появился постоянный график занятий.",
    result: "Стал гораздо собраннее и поступил в МИРЭА, на ИТ-инфраструктуру.",
    highlight: "МИРЭА",
  },
];

// Screenshots of messages from students and parents (names redacted).
export const reviewShots = Array.from({ length: 15 }, (_, i) => `evidence/review-${String(i + 1).padStart(2, "0")}.webp`);

// ---------------------------------------------------------------- scene 02: evidence — seven routes, each with its review
// A case is one story: the result first, then the route (было → решили → делали → вышло),
// and the message the family or the student sent afterwards.
export type Review = { shot: string; excerpt: string; source: string };
export type EvidenceCase = {
  unit: string;
  exam: string;
  subjects: string;
  result: string;
  title: string;
  span?: string;
  route: { label: string; text: string }[];
  reviews: Review[];
};

const shot = (n: number) => `evidence/review-${String(n).padStart(2, "0")}.webp`;
// the review that belongs to each module (the others go to "ещё отзывы")
const caseReviews: Record<string, Review[]> = {
  "06": [{ shot: shot(15), source: "из отзыва ученика", excerpt: "Объясняет нормально, на человеческом языке, если ты <…> не понял с первого раза, объяснит ещё раз, только уже по-другому, пока не дойдёт." }],
  "03": [{ shot: shot(12), source: "из переписки с учеником", excerpt: "МГУ <…> Высшая школа управления и иноваций." }],
  "08": [{ shot: shot(13), source: "из переписки с учеником", excerpt: "Всё отлично, поступил на радиоэлектронику и лазерку в Бауманке. <…> Всё хорошо, учиться сложно." }],
  "09": [{ shot: shot(14), source: "из переписки с учеником", excerpt: "Меня короче в ИТМО на фотонику взяли. На тоненького прошёл, в списках чёт второй с конца вроде был, но взяли." }],
  "01": [{ shot: shot(1), source: "из сообщения родителя", excerpt: "Вы нам очень помогли не только в учёбе, но и в психологическом состоянии и в моральном плане." }],
  "02": [{ shot: shot(4), source: "из сообщения родителя", excerpt: "Поступил в МИРЭА на ИТ-инфраструктуру. <…> Да, я рассказываю о вас, если кто-то спрашивает." }],
  "04": [{ shot: shot(2), source: "из сообщения родителя", excerpt: "Он действительно с большим интересом и охотой занимался. Я думаю, что он в вас нашёл не просто учителя, но и наставника, друга, товарища." }],
  "05": [
    { shot: shot(9), source: "из отзыва ученицы", excerpt: "Задания идут постепенно, от простого к более сложному, поэтому в процессе подготовки особых трудностей не возникало. Также преподаватель без проблем отвечает на вопросы вне занятий." },
    { shot: shot(7), source: "из переписки с ученицей", excerpt: "О, прикиньте, у меня в школе самый высокий суммарный балл за 3 предмета. У меня 265." },
    { shot: shot(5), source: "из сообщения ученицы", excerpt: "Я поступила в МГСУ, управление в строительстве, у меня всё хорошо." },
  ],
  "07": [{ shot: shot(3), source: "из переписки с родителем", excerpt: "Поступил <…> в МИРЭА, надеюсь, осилит обучение. <…> Да, конечно буду рекомендовать вас." }],
};

export const evidenceCases: EvidenceCase[] = trajectories.map((t) => ({
  unit: t.unit,
  exam: t.exam,
  subjects: t.subjects,
  result: t.highlight,
  title: t.title,
  span: t.span,
  route: [
    { label: "Было", text: t.start },
    { label: "Решили", text: t.task },
    { label: "Делали", text: t.work },
    { label: "Вышло", text: t.result },
  ],
  reviews: caseReviews[t.unit] ?? [],
}));

// reviews without a module of their own
export const moreReviews: { shots: string[]; excerpt: string; source: string }[] = [
  { shots: [shot(8), shot(6)], source: "ученица · базовая математика", excerpt: "Пришла с пустой головой и забытыми знаниями, а ушла с твёрдой 4 за экзамен по базовой математике, на что изначально вообще не рассчитывала." },
  { shots: [shot(10)], source: "ученик · информатика", excerpt: "С ним гораздо лучше стал понимать язык программирования, в целом получил множество хороших советов по экзамену." },
  { shots: [shot(11)], source: "ученица · 9 класс", excerpt: "Всё понятно объясняет и разбирает каждый момент, который не понятен. Благодаря ему закончила 9 класс на отлично." },
];

// ---------------------------------------------------------------- scene 05: work (Edison) — how the system reacts
// General rules: what happens after which event.
export const controlRules = [
  "После входной диагностики собирается стартовый маршрут: что уже устойчиво, где пробелы, с чего начинать.",
  "После серии домашних работ система повышает сложность, если тема закрывается стабильно.",
  "Если ошибка повторяется, тема возвращается в активный контур до закрепления.",
  "После каждого занятия ученик и родитель получают короткий отчёт: что сделали, что просело, что дальше.",
];


// ---------------------------------------------------------------- scene 06: one knowledge map, one student's route
// Real data from the Hopes and Dreams repository (github.com/Mifikcha/Acheba):
// topics and order — programme "Джентельменский набор (11 класс ЕГЭ, до 80 баллов)" and Google Sheets Export/04_Темы.csv;
// links — wikilinks between the physics theory notes (Физика/_Теория); statuses — topic_progress_status in 00_Настройки.csv.
// The student is a demonstration: the states below are not a real person's progress.
// Frame space of the knowledge flight's last frame (1920×1080); the sphere sits at (742, 510).
export type TopicState = "done" | "current" | "returned" | "next" | "todo";
export type MapTopic = { id: string; name: string; x: number; y: number; state: TopicState; label?: "s" | "n" | "e" | "w" | "l" | "dim" };

export const physicsMap: MapTopic[] = [
  // Модуль 2. Механика — closed, the quiet upper-left constellation
  { id: "MECH-001", name: "Равномерное и равноускоренное движение", x: 260, y: 170, state: "done" },
  { id: "MECH-002", name: "Законы Ньютона", x: 370, y: 120, state: "done" },
  { id: "MECH-003", name: "Силы", x: 400, y: 250, state: "done" },
  { id: "MECH-004", name: "Импульс", x: 500, y: 150, state: "done" },
  { id: "MECH-005", name: "Энергия", x: 510, y: 300, state: "done" },
  { id: "MECH-006", name: "Работа", x: 470, y: 410, state: "done" },
  { id: "MECH-007", name: "Движение по окружности", x: 250, y: 300, state: "done" },
  { id: "MECH-008", name: "Гравитация", x: 160, y: 230, state: "done" },
  { id: "MECH-009", name: "Движение под углом к горизонту", x: 180, y: 390, state: "done" },
  { id: "MECH-010", name: "Статика", x: 330, y: 370, state: "done" },
  { id: "MECH-PMX", name: "Простые механизмы", x: 270, y: 470, state: "done" },
  { id: "MECH-011", name: "Механические волны и колебания", x: 420, y: 620, state: "done", label: "dim" },
  // Модуль 3. МКТ — closed, upper right
  { id: "MKT-001", name: "Теория МКТ", x: 1080, y: 95, state: "done" },
  { id: "MKT-002", name: "Газовые процессы", x: 1200, y: 75, state: "done" },
  { id: "MKT-003", name: "Газовые циклы", x: 1310, y: 120, state: "done" },
  { id: "MKT-004", name: "Фазовые переходы", x: 1170, y: 205, state: "done" },
  { id: "MKT-005", name: "Пары", x: 1290, y: 230, state: "done" },
  // Модуль 4. Электродинамика — where the student is now. On the route screen these nine are real stars of the
  // sky (the stage pins a bright star under each), placed in the open sky of that camera stop.
  { id: "EM-001", name: "Электростатика", x: 390, y: 200, state: "done" },
  { id: "EM-002", name: "Вещество в электрическом поле", x: 520, y: 255, state: "done" },
  { id: "EM-003", name: "Электрический ток", x: 605, y: 360, state: "done" },
  { id: "EM-004", name: "Конденсатор", x: 735, y: 405, state: "returned", label: "s" },
  { id: "EM-005", name: "Цепи", x: 865, y: 335, state: "done" },
  { id: "EM-006", name: "Магнитное поле", x: 995, y: 420, state: "done" },
  { id: "EM-007", name: "Индукция и движение проводников", x: 960, y: 575, state: "current", label: "s" },
  { id: "EM-008", name: "Самоиндукция", x: 815, y: 665, state: "next", label: "s" },
  { id: "EM-009", name: "Колебательный контур", x: 660, y: 715, state: "next", label: "w" },
  { id: "EM-010", name: "Геометрическая оптика", x: 330, y: 930, state: "todo" },
  { id: "EM-011", name: "Линзы", x: 220, y: 870, state: "todo" },
  { id: "EM-012", name: "Волновая оптика", x: 250, y: 740, state: "todo" },
  // Модуль 5. Кванты — not started
  { id: "QUANT-001", name: "Квантовая механика", x: 140, y: 520, state: "todo" },
  { id: "QUANT-002", name: "Фотоэффект", x: 180, y: 630, state: "todo" },
  { id: "QUANT-003", name: "Ядерные реакции", x: 250, y: 560, state: "todo" },
];

// The trajectory: the programme's own order through module 4.
export const routeWalked = ["EM-001", "EM-002", "EM-003", "EM-004", "EM-005", "EM-006", "EM-007"];
export const routeAhead = ["EM-007", "EM-008", "EM-009"];

// The whole programme in order, one mark per topic, for the progress strip.
export const programmeStrip: { module: string; states: TopicState[] }[] = [
  { module: "Математический аппарат", states: Array(13).fill("done") },
  { module: "Механика", states: Array(12).fill("done") },
  { module: "МКТ", states: Array(5).fill("done") },
  { module: "Электродинамика", states: ["done", "done", "done", "returned", "done", "done", "current", "next", "next", "todo", "todo", "todo"] },
  { module: "Кванты", states: Array(3).fill("todo") },
];

export const routePassport = {
  route: "ЕГЭ по физике · до 80 баллов",
  programme: "Джентельменский набор · модуль 4 из 5",
  start: "Диагностика: механика на уровне первой части, МКТ и электродинамика с нуля.",
  focus: { topic: "Индукция и движение проводников", meta: "ФИЗ-ЭМ-007 · урок 2 из 3" },
  returned: { topic: "Конденсатор", meta: "ошибки повторялись в заданиях 14, 15, 25" },
  next: ["Самоиндукция", "Колебательный контур"],
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
    price: "2 000 ₽",
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
  { id: "top", index: "01", title: "Начало", progress: 0.42 },
  { id: "evidence", index: "02", title: "Истории", progress: 0.5 },
  { id: "work", index: "03", title: "Маршрут", progress: 0.62 },
  { id: "subjects", index: "04", title: "Предметы", progress: 0.8 },
  { id: "author", index: "05", title: "Автор", progress: 0.88 },
  { id: "formats", index: "06", title: "Форматы", progress: 0.95 },
  { id: "contact", index: "07", title: "Связаться", progress: 1 },
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
