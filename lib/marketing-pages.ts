// Static content for the simple marketing pages (about / contact / careers /
// legal). Kept here rather than in messages/*.json to avoid bloating the i18n
// bundle with long prose. The legal copy is a reasonable starting template —
// review with counsel before relying on it.

export interface DocSection {
  h: string
  body: string
}
export interface DocContent {
  kicker: string
  title: string
  intro?: string
  sections?: DocSection[]
}
type Loc = 'az' | 'ru'

export function pickDoc(
  locale: string,
  content: Record<Loc, DocContent>
): DocContent {
  return content[locale === 'ru' ? 'ru' : 'az']
}

export const CONTACT_EMAIL = 'salam@stokly.app'

export const LEGAL_UPDATED: Record<Loc, string> = {
  az: 'Son yenilənmə: 13 iyun 2026',
  ru: 'Последнее обновление: 13 июня 2026',
}

export const ABOUT: Record<Loc, DocContent> = {
  az: {
    kicker: 'Haqqımızda',
    title: 'Stokly nədir',
    intro:
      'Stokly — restoran, kafe və HoReCa biznesləri üçün inventar və maya dəyəri idarəetmə platformasıdır. Məqsədimiz mətbəxdə nəyin alındığını, işləndiyini və itirildiyini son qramına qədər görünən etməkdir.',
    sections: [
      {
        h: 'Problem',
        body: 'Restoranların əksəriyyəti gəlirini bilir, amma maya dəyərini yox. Görünməyən itki, köhnəlmiş qiymətlər və əl ilə aparılan sayımlar mənfəəti səssizcə yeyir.',
      },
      {
        h: 'Yanaşmamız',
        body: 'Alış → hazırlıq → satış → itki → sayım — bütün dövrü bir yerdə bağlayırıq. Hər resept real maya dəyəri ilə qiymətlənir, hər sayım nəzəri istifadə ilə müqayisə olunur.',
      },
      {
        h: 'Kimin üçün',
        body: 'Tək məkanlı kafedən çox stansiyalı (mətbəx, bar, anbar) restorana qədər — sahibkar, menecer və mətbəx komandası üçün.',
      },
    ],
  },
  ru: {
    kicker: 'О нас',
    title: 'Что такое Stokly',
    intro:
      'Stokly — платформа управления складом и себестоимостью для ресторанов, кафе и сферы HoReCa. Наша цель — сделать видимым до грамма, что закуплено, израсходовано и списано на кухне.',
    sections: [
      {
        h: 'Проблема',
        body: 'Большинство ресторанов знают выручку, но не себестоимость. Невидимые списания, устаревшие цены и ручные подсчёты тихо съедают прибыль.',
      },
      {
        h: 'Наш подход',
        body: 'Закупка → заготовка → продажа → списание → инвентаризация — мы замыкаем весь цикл в одном месте. Каждый рецепт оценивается по реальной себестоимости, каждая инвентаризация сверяется с теоретическим расходом.',
      },
      {
        h: 'Для кого',
        body: 'От кафе с одной точкой до ресторана с несколькими станциями (кухня, бар, склад) — для владельца, менеджера и кухонной команды.',
      },
    ],
  },
}

export const CONTACT: Record<Loc, DocContent> = {
  az: {
    kicker: 'Əlaqə',
    title: 'Bizimlə əlaqə',
    intro:
      'Sualınız var, yoxsa Stokly-ni öz biznesinizdə sınamaq istəyirsiniz? Sizi eşitməyə şadıq.',
    sections: [
      { h: 'E-poçt', body: CONTACT_EMAIL },
      {
        h: 'Demo',
        body: 'Canlı demo üçün ana səhifədəki demo formasını doldurun — komandamız qısa müddətdə sizinlə əlaqə saxlayacaq.',
      },
    ],
  },
  ru: {
    kicker: 'Контакты',
    title: 'Свяжитесь с нами',
    intro:
      'Есть вопрос или хотите попробовать Stokly в своём заведении? Будем рады услышать вас.',
    sections: [
      { h: 'E-mail', body: CONTACT_EMAIL },
      {
        h: 'Демо',
        body: 'Для живого демо заполните форму на главной странице — наша команда свяжется с вами в ближайшее время.',
      },
    ],
  },
}

export const CAREERS: Record<Loc, DocContent> = {
  az: {
    kicker: 'Karyera',
    title: 'Tezliklə',
    intro:
      'Hələ açıq vakansiyamız yoxdur. Komandamız böyüdükcə imkanlar burada görünəcək — bir az sonra yenidən baxın.',
  },
  ru: {
    kicker: 'Карьера',
    title: 'Скоро',
    intro:
      'Пока открытых вакансий нет. По мере роста команды возможности появятся здесь — загляните чуть позже.',
  },
}

export const TERMS: Record<Loc, DocContent> = {
  az: {
    kicker: 'Hüquqi',
    title: 'İstifadə şərtləri',
    intro:
      'Stokly-dən (stokly.app) istifadə etməklə aşağıdakı şərtləri qəbul etmiş olursunuz.',
    sections: [
      {
        h: '1. Qəbul',
        body: 'Xidmətdən istifadə bu şərtlərlə razılığınızı bildirir. Razı deyilsinizsə, Stokly-dən istifadə etməyin.',
      },
      {
        h: '2. Xidmət',
        body: 'Stokly abunə əsaslı inventar və maya dəyəri idarəetmə proqramıdır. Xidməti təkmilləşdirə, dəyişə və ya dayandıra bilərik.',
      },
      {
        h: '3. Hesab',
        body: 'Giriş məlumatlarınızın gizliliyinə və hesabınız altında aparılan əməliyyatlara görə siz məsuliyyət daşıyırsınız.',
      },
      {
        h: '4. Abunə və ödəniş',
        body: 'Ödənişli planlar seçilmiş dövr üçün əvvəlcədən hesablanır. Sınaq müddəti pulsuzdur və öhdəlik yaratmır.',
      },
      {
        h: '5. Məlumatlarınız',
        body: 'Daxil etdiyiniz biznes məlumatları sizə məxsusdur. Onların emalı Məxfilik Siyasətimizə uyğun aparılır.',
      },
      {
        h: '6. Məsuliyyətin məhdudlaşdırılması',
        body: 'Xidmət “olduğu kimi” təqdim olunur. Qanunun yol verdiyi həddə Stokly dolayı və ya təsadüfi zərərlərə görə məsuliyyət daşımır.',
      },
      { h: '7. Əlaqə', body: `Suallar üçün: ${CONTACT_EMAIL}` },
    ],
  },
  ru: {
    kicker: 'Правовая информация',
    title: 'Условия использования',
    intro:
      'Используя Stokly (stokly.app), вы соглашаетесь с приведёнными ниже условиями.',
    sections: [
      {
        h: '1. Принятие',
        body: 'Использование сервиса означает согласие с этими условиями. Если вы не согласны — не используйте Stokly.',
      },
      {
        h: '2. Сервис',
        body: 'Stokly — программа управления складом и себестоимостью по подписке. Мы можем улучшать, изменять или приостанавливать сервис.',
      },
      {
        h: '3. Аккаунт',
        body: 'Вы отвечаете за конфиденциальность данных для входа и за действия, совершённые под вашим аккаунтом.',
      },
      {
        h: '4. Подписка и оплата',
        body: 'Платные планы оплачиваются авансом за выбранный период. Пробный период бесплатен и ни к чему не обязывает.',
      },
      {
        h: '5. Ваши данные',
        body: 'Введённые бизнес-данные принадлежат вам. Их обработка осуществляется согласно нашей Политике конфиденциальности.',
      },
      {
        h: '6. Ограничение ответственности',
        body: 'Сервис предоставляется «как есть». В пределах, допустимых законом, Stokly не несёт ответственности за косвенные или случайные убытки.',
      },
      { h: '7. Контакты', body: `По вопросам: ${CONTACT_EMAIL}` },
    ],
  },
}

export const PRIVACY: Record<Loc, DocContent> = {
  az: {
    kicker: 'Hüquqi',
    title: 'Məxfilik siyasəti',
    intro:
      'Bu siyasət Stokly-nin hansı məlumatları topladığını və necə istifadə etdiyini izah edir.',
    sections: [
      {
        h: 'Topladığımız məlumatlar',
        body: 'Hesab məlumatları (ad, e-poçt), biznes məlumatları (inqrediyentlər, reseptlər, satış və inventar qeydləri) və texniki jurnal məlumatları.',
      },
      {
        h: 'İstifadə məqsədi',
        body: 'Məlumatları xidməti təqdim etmək, hesabatlar yaratmaq və məhsulu təkmilləşdirmək üçün istifadə edirik.',
      },
      {
        h: 'Saxlanma',
        body: 'Məlumatlar Supabase (PostgreSQL) infrastrukturunda saxlanılır və icazəsiz girişdən qoruyucu tədbirlərlə müdafiə olunur.',
      },
      {
        h: 'Paylaşım',
        body: 'Məlumatlarınızı satmırıq. Yalnız xidməti işlətmək üçün zəruri olan təchizatçılarla (hostinq, e-poçt) paylaşa bilərik.',
      },
      {
        h: 'Hüquqlarınız',
        body: 'Məlumatlarınıza baxmaq, düzəltmək və ya silinməsini tələb etmək hüququnuz var.',
      },
      { h: 'Əlaqə', body: `Məxfiliklə bağlı suallar: ${CONTACT_EMAIL}` },
    ],
  },
  ru: {
    kicker: 'Правовая информация',
    title: 'Политика конфиденциальности',
    intro:
      'Эта политика объясняет, какие данные собирает Stokly и как мы их используем.',
    sections: [
      {
        h: 'Какие данные мы собираем',
        body: 'Данные аккаунта (имя, e-mail), бизнес-данные (ингредиенты, рецепты, записи о продажах и складе) и технические журналы.',
      },
      {
        h: 'Цели использования',
        body: 'Мы используем данные, чтобы предоставлять сервис, формировать отчёты и улучшать продукт.',
      },
      {
        h: 'Хранение',
        body: 'Данные хранятся в инфраструктуре Supabase (PostgreSQL) и защищены мерами от несанкционированного доступа.',
      },
      {
        h: 'Передача',
        body: 'Мы не продаём ваши данные. Мы можем передавать их только поставщикам, необходимым для работы сервиса (хостинг, e-mail).',
      },
      {
        h: 'Ваши права',
        body: 'Вы вправе просматривать, исправлять или запрашивать удаление своих данных.',
      },
      { h: 'Контакты', body: `Вопросы о конфиденциальности: ${CONTACT_EMAIL}` },
    ],
  },
}

export const COOKIES: Record<Loc, DocContent> = {
  az: {
    kicker: 'Hüquqi',
    title: 'Kuki siyasəti',
    intro: 'Stokly minimal sayda və yalnız zəruri kukilərdən istifadə edir.',
    sections: [
      {
        h: 'Kuki nədir',
        body: 'Kukilər saytdan istifadə zamanı brauzerinizdə saxlanan kiçik mətn fayllarıdır.',
      },
      {
        h: 'İstifadə etdiyimiz kukilər',
        body: 'Yalnız zəruri kukilər: sessiya/autentifikasiya (daxil olmuş qalmağınız üçün) və dil seçimi.',
      },
      {
        h: 'Üçüncü tərəf kukiləri',
        body: 'Marketinq və ya reklam izləmə kukiləri istifadə etmirik.',
      },
      {
        h: 'İdarəetmə',
        body: 'Brauzer parametrlərindən kukiləri silə və ya bloklaya bilərsiniz, lakin bu halda hesaba daxil olmaq mümkün olmaya bilər.',
      },
      { h: 'Əlaqə', body: CONTACT_EMAIL },
    ],
  },
  ru: {
    kicker: 'Правовая информация',
    title: 'Политика cookie',
    intro: 'Stokly использует минимум cookie — только необходимые.',
    sections: [
      {
        h: 'Что такое cookie',
        body: 'Cookie — это небольшие текстовые файлы, которые сохраняются в вашем браузере при использовании сайта.',
      },
      {
        h: 'Какие cookie мы используем',
        body: 'Только необходимые: сессия/аутентификация (чтобы вы оставались в системе) и выбор языка.',
      },
      {
        h: 'Сторонние cookie',
        body: 'Мы не используем маркетинговые или рекламные отслеживающие cookie.',
      },
      {
        h: 'Управление',
        body: 'Вы можете удалить или заблокировать cookie в настройках браузера, но тогда вход в аккаунт может стать невозможным.',
      },
      { h: 'Контакты', body: CONTACT_EMAIL },
    ],
  },
}
