export type Lang = 'uk' | 'en';

const uk: Record<string, string> = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  'nav.knowledgeBases': 'Бази знань',
  'nav.chat': 'Чат',
  'nav.settings': 'Налаштування',
  'nav.signOut': 'Вийти',

  // ── Permissions (dynamic API values) ────────────────────────────────────────
  'permission.viewer': 'Переглядач',
  'permission.editor': 'Редактор',

  // ── Login page ───────────────────────────────────────────────────────────────
  'login.subtitle.signIn': 'Увійдіть, щоб продовжити',
  'login.subtitle.register': 'Створіть обліковий запис',
  'login.tab.signIn': 'Увійти',
  'login.tab.signUp': 'Зареєструватись',
  'login.label.name': "Ім'я",
  'login.placeholder.name': "Ваше ім'я",
  'login.label.email': 'Email',
  'login.placeholder.email': 'you@example.com',
  'login.label.password': 'Пароль',
  'login.placeholder.password': '••••••••',
  'login.error.generic': 'Щось пішло не так. Спробуйте ще раз.',
  'login.loading': 'Зачекайте…',
  'login.submit.signIn': 'Увійти',
  'login.submit.register': 'Створити обліковий запис',

  // ── Dashboard page ───────────────────────────────────────────────────────────
  'dashboard.heading': 'Бази знань',
  'dashboard.subtitle': 'Керуйте своїми колекціями документів',
  'dashboard.newKB': 'Нова БЗ',
  'dashboard.invitations.banner.one': 'У вас {count} нове запрошення',
  'dashboard.invitations.banner.many': 'У вас {count} нових запрошень',
  'dashboard.invitations.view': 'Переглянути',
  'dashboard.invitations.title': 'Незакриті запрошення',
  'dashboard.invitations.empty': 'Немає незакритих запрошень',
  'dashboard.empty.title': 'Баз знань ще немає',
  'dashboard.empty.subtitle': 'Створіть одну, щоб почати завантажувати документи',
  'dashboard.empty.create': 'Створити базу знань',
  'dashboard.create.title': 'Нова база знань',
  'dashboard.create.nameLabel': 'Назва *',
  'dashboard.create.namePlaceholder': 'напр. Документація продукту',
  'dashboard.create.descLabel': 'Опис',
  'dashboard.create.descPlaceholder': "Необов'язковий опис",
  'dashboard.create.cancel': 'Скасувати',
  'dashboard.create.submit': 'Створити',
  'dashboard.create.creating': 'Створення…',
  'dashboard.create.nameRequired': "Назва обов'язкова",
  'dashboard.card.shared': 'Спільна',
  'dashboard.card.sharedBy': 'від {name}',
  'dashboard.card.docs': 'документів',
  'dashboard.card.chunks': 'фрагментів',
  'dashboard.card.updated': 'Оновлено {date}',
  'dashboard.deleteKb.title': 'Видалити базу знань',
  'dashboard.deleteKb.message':
    'Видалити "{name}"? Всі документи та вкладення буде назавжди видалено. Цю дію неможливо скасувати.',

  // ── KB detail page ───────────────────────────────────────────────────────────
  'kb.back': 'Всі бази знань',
  'kb.sharedBy': 'Спільна від {name}',
  'kb.stat.documents': 'документів',
  'kb.stat.chunks': 'фрагментів',
  'kb.btn.share': 'Поділитись',
  'kb.btn.deleteKB': 'Видалити БЗ',
  'kb.empty.title': 'Документів ще немає',
  'kb.empty.subtitle': 'Перетягніть файли вище, щоб почати',
  'kb.docs.heading': 'Документи',
  'kb.deleteKb.title': 'Видалити базу знань',
  'kb.deleteKb.message':
    'Видалити "{name}"? Це назавжди видалить усі {count} документ(ів) та їхні вкладення.',
  'kb.deleteDoc.title': 'Видалити документ',
  'kb.deleteDoc.message':
    'Видалити "{title}"? Всі пов\'язані фрагменти та вкладення буде видалено.',
  'kb.share.title': 'Поділитись базою знань',
  'kb.share.emailLabel': 'Запросити за email',
  'kb.share.emailPlaceholder': 'colleague@example.com',
  'kb.share.sharing': 'Надсилання…',
  'kb.share.shareBtn': 'Поділитись',
  'kb.share.legend':
    'Переглядач — може шукати і спілкуватись · Редактор — може також завантажувати документи',
  'kb.share.peopleWithAccess': 'Хто має доступ',
  'kb.share.onlyYou': 'Лише ви маєте доступ до цієї бази знань.',
  'kb.share.you': 'Ви',
  'kb.share.owner': 'Власник',
  'kb.doc.chunks': 'фрагм.',

  // ── Chat page ────────────────────────────────────────────────────────────────
  'chat.kbLabel': 'База знань',
  'chat.selectKb': 'Оберіть БЗ…',
  'chat.newChat': 'Нова розмова',
  'chat.empty.noChats': 'Розмов ще немає',
  'chat.empty.selectKb': 'Оберіть БЗ для перегляду розмов',
  'chat.untitled': 'Розмова без назви',
  'chat.kbbar.label': 'База знань:',
  'chat.message.startPrompt': 'Поставте запитання, щоб почати розмову',
  'chat.emptyState.hasKb': 'Почати нову розмову',
  'chat.emptyState.noKb': 'Оберіть базу знань, щоб розпочати',
  'chat.emptyState.newChat': 'Нова розмова',

  // ── Settings page ────────────────────────────────────────────────────────────
  'settings.heading': 'Налаштування',
  'settings.subtitle': 'Параметри пошуку та конфігурація сервера',
  'settings.search.title': 'Параметри пошуку',
  'settings.search.subtitle': 'Зберігаються в браузері — надсилаються з кожним запитом',
  'settings.searchMode.label': 'Режим пошуку',
  'settings.searchMode.desc': 'Стратегія отримання для кожного запиту',
  'settings.topK.label': 'Top K — {value}',
  'settings.topK.desc': 'Кількість фрагментів, отриманих як контекст',
  'settings.server.title': 'Конфігурація сервера',
  'settings.server.subtitle': 'Керується через змінні середовища — лише для читання',
  'settings.embedding.label': 'Провайдер вкладень',
  'settings.embedding.desc': 'Модель для векторизації фрагментів документів',
  'settings.reranker.label': 'NVIDIA Reranker',
  'settings.reranker.desc': 'Крос-кодерне ранжування отриманих фрагментів',
  'settings.serverNote': 'Налаштовано на сервері через .env',

  // ── 404 page ─────────────────────────────────────────────────────────────────
  'notFound.title': 'Сторінку не знайдено',
  'notFound.message': 'Сторінка, яку ви шукаєте, не існує.',
  'notFound.button': 'На головну',

  // ── Status badges ────────────────────────────────────────────────────────────
  'status.ready': 'Готово',
  'status.processing': 'Обробляється',
  'status.uploading': 'Завантажується',
  'status.failed': 'Помилка',

  // ── Upload zone ──────────────────────────────────────────────────────────────
  'upload.idle': 'Перетягніть файли або натисніть для вибору',
  'upload.loading': 'Завантаження…',
  'upload.formats': 'PDF, DOCX, TXT, MD · макс. 50 МБ',

  // ── Input bar ────────────────────────────────────────────────────────────────
  'input.placeholder': 'Поставте запитання про свої документи…',
  'input.hint': 'Enter — надіслати · Shift+Enter — новий рядок',

  // ── Citation panel ───────────────────────────────────────────────────────────
  'citation.source': 'Джерело [{index}]',
  'citation.relevance': 'відповідність',
  'citation.excerpt': 'Витяг',

  // ── Message bubble ───────────────────────────────────────────────────────────
  'message.assistant': 'Асистент',
  'message.match': '{percent}% збіг',

  // ── Confirm dialog ───────────────────────────────────────────────────────────
  'confirm.cancel': 'Скасувати',
  'confirm.delete': 'Видалити',
  'confirm.deleting': 'Видалення…',

  // ── Toast messages ───────────────────────────────────────────────────────────
  'toast.invitationAccepted': 'Запрошення прийнято',
  'toast.invitationAcceptFailed': 'Не вдалося прийняти запрошення',
  'toast.invitationDeclined': 'Запрошення відхилено',
  'toast.invitationDeclineFailed': 'Не вдалося відхилити запрошення',
  'toast.kbLoadFailed': 'Не вдалося завантажити бази знань',
  'toast.kbCreated': 'Базу знань створено',
  'toast.kbCreateFailed': 'Не вдалося створити базу знань',
  'toast.kbDeleted': '"{name}" видалено',
  'toast.kbDeleteFailed': 'Не вдалося видалити базу знань',
  'toast.sharesLoadFailed': 'Не вдалося завантажити список доступів',
  'toast.kbDetailLoadFailed': 'Не вдалося завантажити базу знань',
  'toast.uploadExists': '"{filename}": Документ вже існує в цій базі знань',
  'toast.uploaded.one': '1 файл завантажено — розпочато обробку',
  'toast.uploaded.many': '{count} файлів завантажено — розпочато обробку',
  'toast.docDeleted': '"{title}" видалено',
  'toast.docDeleteFailed': 'Не вдалося видалити документ',
  'toast.accessGranted': 'Доступ надано',
  'toast.shareFailed': 'Не вдалося надати доступ',
  'toast.unshareFailed': 'Не вдалося скасувати доступ',
  'toast.messagesLoadFailed': 'Не вдалося завантажити повідомлення',
  'toast.sessionsLoadFailed': 'Не вдалося завантажити розмови',
  'toast.sessionCreateFailed': 'Не вдалося створити розмову',
  'toast.sessionRenameFailed': 'Не вдалося перейменувати розмову',
  'toast.sessionDeleteFailed': 'Не вдалося видалити розмову',
  'toast.streamFailed': 'Помилка потокової передачі — спробуйте ще раз.',
};

const en: Record<string, string> = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  'nav.knowledgeBases': 'Knowledge Bases',
  'nav.chat': 'Chat',
  'nav.settings': 'Settings',
  'nav.signOut': 'Sign out',

  // ── Permissions ──────────────────────────────────────────────────────────────
  'permission.viewer': 'Viewer',
  'permission.editor': 'Editor',

  // ── Login page ───────────────────────────────────────────────────────────────
  'login.subtitle.signIn': 'Sign in to continue',
  'login.subtitle.register': 'Create your account',
  'login.tab.signIn': 'Sign in',
  'login.tab.signUp': 'Sign up',
  'login.label.name': 'Name',
  'login.placeholder.name': 'Your name',
  'login.label.email': 'Email',
  'login.placeholder.email': 'you@example.com',
  'login.label.password': 'Password',
  'login.placeholder.password': '••••••••',
  'login.error.generic': 'Something went wrong. Please try again.',
  'login.loading': 'Please wait…',
  'login.submit.signIn': 'Sign in',
  'login.submit.register': 'Create account',

  // ── Dashboard page ───────────────────────────────────────────────────────────
  'dashboard.heading': 'Knowledge Bases',
  'dashboard.subtitle': 'Manage your document collections',
  'dashboard.newKB': 'New KB',
  'dashboard.invitations.banner.one': 'You have {count} pending invitation',
  'dashboard.invitations.banner.many': 'You have {count} pending invitations',
  'dashboard.invitations.view': 'View',
  'dashboard.invitations.title': 'Pending Invitations',
  'dashboard.invitations.empty': 'No pending invitations',
  'dashboard.empty.title': 'No knowledge bases yet',
  'dashboard.empty.subtitle': 'Create one to start uploading documents',
  'dashboard.empty.create': 'Create knowledge base',
  'dashboard.create.title': 'New Knowledge Base',
  'dashboard.create.nameLabel': 'Name *',
  'dashboard.create.namePlaceholder': 'e.g. Product Documentation',
  'dashboard.create.descLabel': 'Description',
  'dashboard.create.descPlaceholder': 'Optional description',
  'dashboard.create.cancel': 'Cancel',
  'dashboard.create.submit': 'Create',
  'dashboard.create.creating': 'Creating…',
  'dashboard.create.nameRequired': 'Name is required',
  'dashboard.card.shared': 'Shared',
  'dashboard.card.sharedBy': 'by {name}',
  'dashboard.card.docs': 'docs',
  'dashboard.card.chunks': 'chunks',
  'dashboard.card.updated': 'Updated {date}',
  'dashboard.deleteKb.title': 'Delete Knowledge Base',
  'dashboard.deleteKb.message':
    'Delete "{name}"? This will permanently remove all documents and embeddings. This action cannot be undone.',

  // ── KB detail page ───────────────────────────────────────────────────────────
  'kb.back': 'All Knowledge Bases',
  'kb.sharedBy': 'Shared by {name}',
  'kb.stat.documents': 'documents',
  'kb.stat.chunks': 'chunks',
  'kb.btn.share': 'Share',
  'kb.btn.deleteKB': 'Delete KB',
  'kb.empty.title': 'No documents yet',
  'kb.empty.subtitle': 'Drop files above to get started',
  'kb.docs.heading': 'Documents',
  'kb.deleteKb.title': 'Delete Knowledge Base',
  'kb.deleteKb.message':
    'Delete "{name}"? This will permanently remove all {count} document(s) and their embeddings.',
  'kb.deleteDoc.title': 'Delete Document',
  'kb.deleteDoc.message':
    'Delete "{title}"? All associated chunks and embeddings will be removed.',
  'kb.share.title': 'Share Knowledge Base',
  'kb.share.emailLabel': 'Invite by email',
  'kb.share.emailPlaceholder': 'colleague@example.com',
  'kb.share.sharing': 'Sharing…',
  'kb.share.shareBtn': 'Share',
  'kb.share.legend': 'Viewer — can search and chat · Editor — can also upload documents',
  'kb.share.peopleWithAccess': 'People with access',
  'kb.share.onlyYou': 'Only you have access to this knowledge base.',
  'kb.share.you': 'You',
  'kb.share.owner': 'Owner',
  'kb.doc.chunks': 'chunks',

  // ── Chat page ────────────────────────────────────────────────────────────────
  'chat.kbLabel': 'Knowledge Base',
  'chat.selectKb': 'Select KB…',
  'chat.newChat': 'New chat',
  'chat.empty.noChats': 'No chats yet',
  'chat.empty.selectKb': 'Select a KB to see chats',
  'chat.untitled': 'Untitled chat',
  'chat.kbbar.label': 'Knowledge Base:',
  'chat.message.startPrompt': 'Ask a question to start the conversation',
  'chat.emptyState.hasKb': 'Start a new chat',
  'chat.emptyState.noKb': 'Select a knowledge base to begin',
  'chat.emptyState.newChat': 'New chat',

  // ── Settings page ────────────────────────────────────────────────────────────
  'settings.heading': 'Settings',
  'settings.subtitle': 'Search preferences and server configuration',
  'settings.search.title': 'Search Preferences',
  'settings.search.subtitle': 'Saved in your browser — sent with every chat request',
  'settings.searchMode.label': 'Search Mode',
  'settings.searchMode.desc': 'Retrieval strategy used for every query',
  'settings.topK.label': 'Top K — {value}',
  'settings.topK.desc': 'Number of chunks retrieved as context',
  'settings.server.title': 'Server Configuration',
  'settings.server.subtitle': 'Managed via environment variables — read-only',
  'settings.embedding.label': 'Embedding Provider',
  'settings.embedding.desc': 'Model used to vectorise document chunks',
  'settings.reranker.label': 'NVIDIA Reranker',
  'settings.reranker.desc': 'Cross-encoder reranking of retrieved chunks',
  'settings.serverNote': 'Configured on server via .env',

  // ── 404 page ─────────────────────────────────────────────────────────────────
  'notFound.title': 'Page not found',
  'notFound.message': "The page you're looking for doesn't exist.",
  'notFound.button': 'Go home',

  // ── Status badges ────────────────────────────────────────────────────────────
  'status.ready': 'Ready',
  'status.processing': 'Processing',
  'status.uploading': 'Uploading',
  'status.failed': 'Failed',

  // ── Upload zone ──────────────────────────────────────────────────────────────
  'upload.idle': 'Drop files here or click to browse',
  'upload.loading': 'Uploading…',
  'upload.formats': 'PDF, DOCX, TXT, MD · max 50 MB',

  // ── Input bar ────────────────────────────────────────────────────────────────
  'input.placeholder': 'Ask a question about your documents…',
  'input.hint': 'Enter to send · Shift+Enter for newline',

  // ── Citation panel ───────────────────────────────────────────────────────────
  'citation.source': 'Source [{index}]',
  'citation.relevance': 'relevance',
  'citation.excerpt': 'Excerpt',

  // ── Message bubble ───────────────────────────────────────────────────────────
  'message.assistant': 'Assistant',
  'message.match': '{percent}% match',

  // ── Confirm dialog ───────────────────────────────────────────────────────────
  'confirm.cancel': 'Cancel',
  'confirm.delete': 'Delete',
  'confirm.deleting': 'Deleting…',

  // ── Toast messages ───────────────────────────────────────────────────────────
  'toast.invitationAccepted': 'Invitation accepted',
  'toast.invitationAcceptFailed': 'Failed to accept invitation',
  'toast.invitationDeclined': 'Invitation declined',
  'toast.invitationDeclineFailed': 'Failed to decline invitation',
  'toast.kbLoadFailed': 'Failed to load knowledge bases',
  'toast.kbCreated': 'Knowledge base created',
  'toast.kbCreateFailed': 'Failed to create knowledge base',
  'toast.kbDeleted': '"{name}" deleted',
  'toast.kbDeleteFailed': 'Failed to delete knowledge base',
  'toast.sharesLoadFailed': 'Failed to load shares',
  'toast.kbDetailLoadFailed': 'Failed to load knowledge base',
  'toast.uploadExists': '"{filename}": Document already exists in this knowledge base',
  'toast.uploaded.one': '1 file uploaded — processing started',
  'toast.uploaded.many': '{count} files uploaded — processing started',
  'toast.docDeleted': '"{title}" deleted',
  'toast.docDeleteFailed': 'Failed to delete document',
  'toast.accessGranted': 'Access granted',
  'toast.shareFailed': 'Failed to share',
  'toast.unshareFailed': 'Failed to remove access',
  'toast.messagesLoadFailed': 'Failed to load messages',
  'toast.sessionsLoadFailed': 'Failed to load sessions',
  'toast.sessionCreateFailed': 'Failed to create chat session',
  'toast.sessionRenameFailed': 'Failed to rename session',
  'toast.sessionDeleteFailed': 'Failed to delete session',
  'toast.streamFailed': 'Streaming failed — please try again.',
};

export const translations: Record<Lang, Record<string, string>> = { uk, en };
