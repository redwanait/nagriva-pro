/* ════════════════════════════════════════════════════════
   NAGRIVA — i18n Engine (Language & Currency)
   ════════════════════════════════════════════════════════ */

;(function () {
  'use strict'

  var STORAGE_LANG = 'nagriva_lang'
  var STORAGE_CURRENCY = 'nagriva_currency'
  var DEFAULT_LANG = 'en'
  var DEFAULT_CURRENCY = 'USD'

  /* ─── Translations ─── */
  var translations = {
    en: {
      'nav.home': 'Home',
      'nav.services': 'Services',
      'nav.results': 'Results',
      'nav.pricing': 'Pricing',
      'nav.about': 'About',
      'nav.contact': 'Contact',
      'nav.web-design': 'Web Design',
      'nav.seo': 'SEO Optimization',
      'nav.branding': 'Brand Identity',
      'nav.ai-automation': 'AI Automation',
      'nav.social-media': 'Social Media',
      'nav.strategy': 'Strategy',
      'nav.dashboard': 'Dashboard',
      'nav.orders': 'Orders',
      'nav.profile': 'Profile',
      'nav.signin': 'Sign In',
      'nav.book-call': 'Get Started',

      'hero.badge': 'Digital Growth Agency',
      'hero.title': 'Grow Your Brand.<br/><span class="hero-highlight">Scale Your Revenue.</span>',
      'hero.subtitle': 'Premium digital agency crafting high-performance websites, SEO, and growth strategies for modern brands.',
      'hero.subtitle2': 'We design, optimize and grow websites that attract more traffic, convert more leads and scale your business — with precision and strategy.',
      'hero.cta': 'View Our Work',
      'hero.cta2': 'Explore Services',
      'hero.view-results': 'Learn More',
      'hero.trust-fast': 'Fast Results',
      'hero.trust-seo': 'SEO Optimized',
      'hero.trust-conversion': 'Conversion Focused',

      'services.tag': '✦ What we do',
      'services.title': 'Everything You Need to <span class="text-gradient">Grow</span>',
      'services.subtitle': 'End-to-end digital solutions crafted to position your brand ahead of the competition.',
      'services.web-design': 'Web Design',
      'services.web-design-desc': 'High-end, conversion-optimized websites that capture your brand essence.',
      'services.seo': 'SEO Optimization',
      'services.seo-desc': 'Data-driven strategies to dominate search rankings and drive organic growth.',
      'services.branding': 'Brand Identity',
      'services.branding-desc': 'Distinctive visual identities that resonate and create lasting recognition.',
      'services.ai-automation': 'AI Automation',
      'services.ai-automation-desc': 'Smart workflows and AI tools that streamline operations and scale efficiency.',
      'services.social': 'Social Media',
      'services.social-desc': 'Strategic content and campaigns that build communities and spark engagement.',
      'services.strategy': 'Strategy',
      'services.strategy-desc': 'Roadmaps and consulting to align your digital presence with business goals.',
      'services.cta': 'Explore {{service}}',

      'results.tag': 'By the numbers',
      'results.title': 'Our <span class="text-gradient">Impact</span>',
      'results.subtitle': 'Measurable outcomes that compound over time for our clients.',

      'pricing.title': 'Plans & <span class="text-gradient">Packages</span>',
      'pricing.subtitle': 'Scalable solutions crafted for your business goals. From brand launches to custom builds.',
      'pricing.brand-launch': 'Brand & Launch',
      'pricing.brand-launch-desc': 'Kickstart your online presence with a custom website, blog, or brand identity.',
      'pricing.scale-convert': 'Scale & Convert',
      'pricing.scale-convert-desc': 'Growth-focused websites and digital tools engineered to turn visitors into loyal customers.',
      'pricing.custom': 'Custom Solutions',
      'pricing.custom-desc': 'Bespoke digital solutions tailored to your unique needs.',
      'pricing.starting-price': 'Starting Price',
      'pricing.starting-from': 'Starting From',
      'pricing.most-popular': 'Most Popular',
      'pricing.view-packages': 'View Packages',
      'pricing.get-started': 'Get Started',
      'pricing.contact-us': 'Contact Us',

      'faq.tag': '✦ FAQ',
      'faq.title': 'Frequently Asked <span class="faq-title-gradient">Questions</span>',
      'faq.subtitle': 'Everything you need to know about working with us. Can\'t find what you\'re looking for? Our team is here to help.',

      'cta.title': 'Ready to Transform<br/>Your <span class="text-gradient">Digital Presence?</span>',
      'cta.desc': 'Book a free strategy call. No commitment — just a conversation about your goals.',
      'cta.btn': 'Get Started',

      'process.title': 'From Strategy to Execution',
      'process.badge': 'Our Process',
      'process.desc': 'We follow a structured process designed to keep projects clear, efficient, and aligned with business goals from start to finish.',

      'footer.desc': 'We turn your website into a client-generating machine. Design, SEO, and growth for modern brands.',
      'footer.quick-links': 'Quick Links',
      'footer.services': 'Services',
      'footer.legal': 'Legal',
      'footer.newsletter': 'Newsletter',
      'footer.newsletter-desc': 'Get the latest growth tips and insights delivered to your inbox.',
      'footer.newsletter-placeholder': 'your@email.com',
      'footer.privacy-policy': 'Privacy Policy',
      'footer.terms-of-service': 'Terms of Service',
      'footer.copyright': '© 2026 NAGRIVA. All rights reserved.',
      'footer.secure-payments': 'Secure Payments',
      'footer.cookie-preferences': 'Cookie Preferences',

      'cookie.title': 'Cookie Preferences',
      'cookie.desc': 'We use cookies to enhance your browsing experience, analyze site traffic, and deliver personalized content. You can choose which categories to allow.',
      'cookie.accept-all': 'Accept All',
      'cookie.reject': 'Reject Non-Essential',
      'cookie.manage': 'Manage Preferences',
      'cookie.manage-title': 'Manage Cookie Preferences',
      'cookie.manage-desc': 'Customize which cookies you allow on this website.',
      'cookie.necessary': 'Necessary',
      'cookie.necessary-desc': 'Essential for the website to function properly. Cannot be disabled.',
      'cookie.analytics': 'Analytics',
      'cookie.analytics-desc': 'Help us understand how visitors use our site to improve performance.',
      'cookie.marketing': 'Marketing',
      'cookie.marketing-desc': 'Used to deliver relevant advertisements and track campaign effectiveness.',
      'cookie.save': 'Save Preferences',

      'contact.badge': 'Let\'s talk',
      'contact.title': 'Ready to <span class="contact-highlight">Grow</span> Your Business?',
      'contact.desc': 'Book a free strategy call and let\'s map out a growth plan tailored to your brand. No commitment, just results.',
      'contact.name': 'Your Name',
      'contact.email': 'Your Email',
      'contact.message': 'Your Message',
      'contact.send': 'Send Message',

      'lang.en': 'English',
      'lang.fr': 'Français',
      'lang.ar': 'العربية',

      'currency.label': 'Currency',
    },
    fr: {
      'nav.home': 'Accueil',
      'nav.services': 'Services',
      'nav.results': 'Résultats',
      'nav.pricing': 'Tarifs',
      'nav.about': 'À propos',
      'nav.contact': 'Contact',
      'nav.web-design': 'Web Design',
      'nav.seo': 'Optimisation SEO',
      'nav.branding': 'Identité de Marque',
      'nav.ai-automation': 'Automatisation IA',
      'nav.social-media': 'Médias Sociaux',
      'nav.strategy': 'Stratégie',
      'nav.dashboard': 'Tableau de Bord',
      'nav.orders': 'Commandes',
      'nav.profile': 'Profil',
      'nav.signin': 'Connexion',
      'nav.book-call': 'Commencer',

      'hero.badge': 'Agence de Croissance Digitale',
      'hero.title': 'Nous Créons des Sites Qui Transforment les Visiteurs en <span class="text-gradient">Clients</span>',
      'hero.subtitle': 'Agence digitale premium créant des sites web performants, du SEO et des stratégies de croissance.',
      'hero.subtitle2': 'Nous concevons, optimisons et développons des sites qui attirent plus de trafic, convertissent plus de leads et développent votre entreprise.',
      'hero.cta': 'Voir Notre Travail',
      'hero.cta2': 'Explorer les Services',
      'hero.view-results': 'En Savoir Plus',
      'hero.trust-fast': 'Résultats Rapides',
      'hero.trust-seo': 'Optimisé SEO',
      'hero.trust-conversion': 'Axé Conversion',

      'services.tag': '✦ Notre expertise',
      'services.title': 'Tout ce qu\'il vous faut pour <span class="text-gradient">Grandir</span>',
      'services.subtitle': 'Des solutions digitales complètes conçues pour positionner votre marque en tête de la concurrence.',
      'services.web-design': 'Web Design',
      'services.web-design-desc': 'Sites haut de gamme optimisés pour la conversion.',
      'services.seo': 'Optimisation SEO',
      'services.seo-desc': 'Stratégies data pour dominer les classements de recherche.',
      'services.branding': 'Identité de Marque',
      'services.branding-desc': 'Identités visuelles distinctives qui résonnent.',
      'services.ai-automation': 'Automatisation IA',
      'services.ai-automation-desc': 'Workflows intelligents pour rationaliser les opérations.',
      'services.social': 'Médias Sociaux',
      'services.social-desc': 'Contenu stratégique pour construire des communautés.',
      'services.strategy': 'Stratégie',
      'services.strategy-desc': 'Feuilles de route pour aligner votre présence digitale.',
      'services.cta': 'Explorer {{service}}',

      'results.tag': 'En chiffres',
      'results.title': 'Notre <span class="text-gradient">Impact</span>',
      'results.subtitle': 'Des résultats mesurables qui s\'amplifient dans le temps pour nos clients.',

      'pricing.title': 'Forfaits & <span class="text-gradient">Packages</span>',
      'pricing.subtitle': 'Des solutions évolutives pour vos objectifs commerciaux.',
      'pricing.brand-launch': 'Marque & Lancement',
      'pricing.brand-launch-desc': 'Lancez votre présence en ligne avec un site web personnalisé.',
      'pricing.scale-convert': 'Croissance & Conversion',
      'pricing.scale-convert-desc': 'Sites web axés sur la croissance pour transformer les visiteurs en clients.',
      'pricing.custom': 'Solutions Sur Mesure',
      'pricing.custom-desc': 'Solutions digitales sur mesure pour vos besoins uniques.',
      'pricing.starting-price': 'Prix de Départ',
      'pricing.starting-from': 'À Partir de',
      'pricing.most-popular': 'Le Plus Populaire',
      'pricing.view-packages': 'Voir les Forfaits',
      'pricing.get-started': 'Commencer',
      'pricing.contact-us': 'Contactez-Nous',

      'faq.tag': '✦ FAQ',
      'faq.title': 'Questions Fréquemment<br>Posées',
      'faq.subtitle': 'Tout ce que vous devez savoir sur notre collaboration. Vous ne trouvez pas ce que vous cherchez? Notre équipe est là pour vous aider.',

      'cta.title': 'Prêt à Transformer<br/>Votre <span class="text-gradient">Présence Digitale?</span>',
      'cta.desc': 'Réservez un appel stratégique gratuit. Aucun engagement.',
      'cta.btn': 'Commencer',

      'process.title': 'De la Stratégie à l\'Exécution',
      'process.badge': 'Notre Processus',
      'process.desc': 'Nous suivons un processus structuré conçu pour garder les projets clairs, efficaces et alignés sur les objectifs commerciaux du début à la fin.',

      'footer.desc': 'Nous transformons votre site web en machine à générer des clients.',
      'footer.quick-links': 'Liens Rapides',
      'footer.services': 'Services',
      'footer.legal': 'Mentions Légales',
      'footer.newsletter': 'Newsletter',
      'footer.newsletter-desc': 'Recevez les dernières astuces de croissance dans votre boîte mail.',
      'footer.newsletter-placeholder': 'votre@email.com',
      'footer.privacy-policy': 'Politique de Confidentialité',
      'footer.terms-of-service': 'Conditions d\'Utilisation',
      'footer.copyright': '© 2026 NAGRIVA. Tous droits réservés.',
      'footer.secure-payments': 'Paiements Sécurisés',
      'footer.cookie-preferences': 'Préférences de Cookies',

      'cookie.title': 'Préférences de Cookies',
      'cookie.desc': 'Nous utilisons des cookies pour améliorer votre expérience de navigation, analyser le trafic du site et proposer un contenu personnalisé. Vous pouvez choisir les catégories à autoriser.',
      'cookie.accept-all': 'Tout Accepter',
      'cookie.reject': 'Refuser les Non-Essentiels',
      'cookie.manage': 'Gérer les Préférences',
      'cookie.manage-title': 'Gérer les Préférences de Cookies',
      'cookie.manage-desc': 'Personnalisez les cookies que vous autorisez sur ce site.',
      'cookie.necessary': 'Nécessaires',
      'cookie.necessary-desc': 'Essentiels au bon fonctionnement du site. Ne peuvent pas être désactivés.',
      'cookie.analytics': 'Analytique',
      'cookie.analytics-desc': 'Nous aident à comprendre comment les visiteurs utilisent notre site pour améliorer les performances.',
      'cookie.marketing': 'Marketing',
      'cookie.marketing-desc': 'Utilisés pour diffuser des publicités pertinentes et suivre l\'efficacité des campagnes.',
      'cookie.save': 'Enregistrer les Préférences',

      'contact.badge': 'Parlons-en',
      'contact.title': 'Prêt à <span class="contact-highlight">Développer</span> Votre Entreprise?',
      'contact.desc': 'Réservez un appel stratégique gratuit et élaborons un plan de croissance adapté à votre marque.',
      'contact.name': 'Votre Nom',
      'contact.email': 'Votre Email',
      'contact.message': 'Votre Message',
      'contact.send': 'Envoyer le Message',

      'lang.en': 'English',
      'lang.fr': 'Français',
      'lang.ar': 'العربية',

      'currency.label': 'Devise',
    },
    ar: {
      'nav.home': 'الرئيسية',
      'nav.services': 'الخدمات',
      'nav.results': 'النتائج',
      'nav.pricing': 'الأسعار',
      'nav.about': 'من نحن',
      'nav.contact': 'اتصل بنا',
      'nav.web-design': 'تصميم المواقع',
      'nav.seo': 'تحسين محركات البحث',
      'nav.branding': 'الهوية التجارية',
      'nav.ai-automation': 'أتمتة الذكاء الاصطناعي',
      'nav.social-media': 'وسائل التواصل الاجتماعي',
      'nav.strategy': 'استراتيجية',
      'nav.dashboard': 'لوحة التحكم',
      'nav.orders': 'الطلبات',
      'nav.profile': 'الملف الشخصي',
      'nav.signin': 'تسجيل الدخول',
      'nav.book-call': 'ابدأ الآن',

      'hero.badge': 'وكالة النمو الرقمي',
      'hero.title': 'نبني مواقع تحول الزوار إلى <span class="text-gradient">عملاء</span>',
      'hero.subtitle': 'وكالة رقمية متميزة تصمم مواقع عالية الأداء، تحسين محركات البحث، واستراتيجيات نمو للعلامات التجارية الحديثة.',
      'hero.subtitle2': 'نصمم ونحسن وننمي مواقع تجذب المزيد من الزوار، وتحول المزيد من العملاء المحتملين، وتنمي أعمالك.',
      'hero.cta': 'شاهد أعمالنا',
      'hero.cta2': 'استكشف الخدمات',
      'hero.view-results': 'اعرف المزيد',
      'hero.trust-fast': 'نتائج سريعة',
      'hero.trust-seo': 'محسن لمحركات البحث',
      'hero.trust-conversion': 'مركز على التحويل',

      'services.tag': '✦ ما نقدمه',
      'services.title': 'كل ما تحتاجه <span class="text-gradient">للنمو</span>',
      'services.subtitle': 'حلول رقمية شاملة مصممة لوضع علامتك التجارية في مقدمة المنافسة.',
      'services.web-design': 'تصميم المواقع',
      'services.web-design-desc': 'مواقع عالية الجودة محسنة للتحويل تعكس جوهر علامتك التجارية.',
      'services.seo': 'تحسين محركات البحث',
      'services.seo-desc': 'استراتيجيات مبنية على البيانات للسيطرة على تصنيفات البحث.',
      'services.branding': 'الهوية التجارية',
      'services.branding-desc': 'هويات بصرية مميزة تخلق انطباعاً دائماً.',
      'services.ai-automation': 'أتمتة الذكاء الاصطناعي',
      'services.ai-automation-desc': 'مهام عمل ذكية وأدوات ذكاء اصطناعي لتبسيط العمليات.',
      'services.social': 'التواصل الاجتماعي',
      'services.social-desc': 'محتوى استراتيجي وحملات تبني مجتمعات وتثير التفاعل.',
      'services.strategy': 'استراتيجية',
      'services.strategy-desc': 'خرائط طريق واستشارات لمواءمة وجودك الرقمي مع أهداف العمل.',
      'services.cta': 'استكشف {{service}}',

      'results.tag': 'بالأرقام',
      'results.title': 'تأثيرنا <span class="text-gradient">الملموس</span>',
      'results.subtitle': 'نتائج قابلة للقياس تتراكم بمرور الوقت لعملائنا.',

      'pricing.title': 'الخطط <span class="text-gradient">والباقات</span>',
      'pricing.subtitle': 'حلول قابلة للتطوير مصممة لأهداف عملك.',
      'pricing.brand-launch': 'العلامة التجارية والإطلاق',
      'pricing.brand-launch-desc': 'انطلق بحضورك الرقمي مع موقع ويب مخصص أو مدونة أو هوية تجارية.',
      'pricing.scale-convert': 'النمو والتحويل',
      'pricing.scale-convert-desc': 'مواقع تركز على النمو مصممة لتحويل الزوار إلى عملاء أوفياء.',
      'pricing.custom': 'حلول مخصصة',
      'pricing.custom-desc': 'حلول رقمية مخصصة حسب احتياجاتك الفريدة.',
      'pricing.starting-price': 'السعر الابتدائي',
      'pricing.starting-from': 'يبدأ من',
      'pricing.most-popular': 'الأكثر رواجاً',
      'pricing.view-packages': 'عرض الباقات',
      'pricing.get-started': 'ابدأ الآن',
      'pricing.contact-us': 'اتصل بنا',

      'faq.tag': '✦ الأسئلة الشائعة',
      'faq.title': 'الأسئلة الشائعة',
      'faq.subtitle': 'كل ما تريد معرفته عن العمل معنا. لا تجد ما تبحث عنه؟ فريقنا هنا لمساعدتك.',

      'cta.title': 'مستعد لتحويل<br/>حضورك <span class="text-gradient">الرقمي؟</span>',
      'cta.desc': 'احجز مكالمة استراتيجية مجانية. لا يوجد التزام — مجرد محادثة عن أهدافك.',
      'cta.btn': 'ابدأ الآن',

      'process.title': 'من الاستراتيجية إلى التنفيذ',
      'process.badge': 'عمليتنا',
      'process.desc': 'نتبع عملية منظمة مصممة للحفاظ على وضوح المشاريع وكفاءتها ومواءمتها مع أهداف العمل من البداية إلى النهاية.',

      'footer.desc': 'نحول موقعك الإلكتروني إلى آلة لتوليد العملاء. تصميم، تحسين محركات بحث، ونمو للعلامات التجارية الحديثة.',
      'footer.quick-links': 'روابط سريعة',
      'footer.services': 'الخدمات',
      'footer.legal': 'قانوني',
      'footer.newsletter': 'النشرة البريدية',
      'footer.newsletter-desc': 'احصل على أحدث نصائح النمو والأفكار في بريدك الوارد.',
      'footer.newsletter-placeholder': 'بريدك@الإلكتروني.com',
      'footer.privacy-policy': 'سياسة الخصوصية',
      'footer.terms-of-service': 'شروط الخدمة',
      'footer.copyright': '© 2026 NAGRIVA. جميع الحقوق محفوظة.',
      'footer.secure-payments': 'مدفوعات آمنة',
      'footer.cookie-preferences': 'تفضيلات ملفات تعريف الارتباط',

      'cookie.title': 'تفضيلات ملفات تعريف الارتباط',
      'cookie.desc': 'نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتحليل حركة المرور على الموقع وتقديم محتوى مخصص. يمكنك اختيار الفئات التي تسمح بها.',
      'cookie.accept-all': 'قبول الكل',
      'cookie.reject': 'رفض غير الضرورية',
      'cookie.manage': 'إدارة التفضيلات',
      'cookie.manage-title': 'إدارة تفضيلات ملفات تعريف الارتباط',
      'cookie.manage-desc': 'تخصيص ملفات تعريف الارتباط التي تسمح بها على هذا الموقع.',
      'cookie.necessary': 'ضرورية',
      'cookie.necessary-desc': 'أساسية لعمل الموقع بشكل صحيح. لا يمكن تعطيلها.',
      'cookie.analytics': 'تحليلات',
      'cookie.analytics-desc': 'تساعدنا في فهم كيفية استخدام الزوار للموقع لتحسين الأداء.',
      'cookie.marketing': 'تسويق',
      'cookie.marketing-desc': 'تستخدم لتقديم إعلانات ذات صلة وتتبع فعالية الحملات.',
      'cookie.save': 'حفظ التفضيلات',

      'contact.badge': 'لنتحدث',
      'contact.title': 'مستعد <span class="contact-highlight">لتنمية</span> أعمالك؟',
      'contact.desc': 'احجز مكالمة استراتيجية مجانية ودعنا نخطط لمسار نمو مخصص لعلامتك التجارية.',
      'contact.name': 'اسمك',
      'contact.email': 'بريدك الإلكتروني',
      'contact.message': 'رسالتك',
      'contact.send': 'إرسال الرسالة',

      'lang.en': 'English',
      'lang.fr': 'Français',
      'lang.ar': 'العربية',

      'currency.label': 'العملة',
    }
  }

  /* ─── Currency config ─── */
  var currencies = {
    USD: { symbol: '$', label: 'USD $', rate: 1 },
    EUR: { symbol: '€', label: 'EUR €', rate: 0.92 },
    GBP: { symbol: '£', label: 'GBP £', rate: 0.79 },
    MAD: { symbol: 'DH', label: 'MAD DH', rate: 10.0 }
  }

  /* ─── State ─── */
  var currentLang = localStorage.getItem(STORAGE_LANG) || DEFAULT_LANG
  var currentCurrency = localStorage.getItem(STORAGE_CURRENCY) || DEFAULT_CURRENCY

  /* ─── Init ─── */
  function init () {
    applyLang(currentLang, true)
    applyCurrency(currentCurrency, true)
    bindSelectors()
  }

  /* ─── Language ─── */
  function applyLang (lang, initial) {
    if (!translations[lang]) lang = DEFAULT_LANG
    currentLang = lang
    localStorage.setItem(STORAGE_LANG, lang)

    var html = document.documentElement
    html.setAttribute('lang', lang === 'ar' ? 'ar' : lang)

    if (lang === 'ar') {
      html.setAttribute('dir', 'rtl')
    } else {
      html.setAttribute('dir', 'ltr')
    }

    translateDOM(lang)
    updateLangSelector(lang)
    if (!initial) animateTransition()
  }

  function translateDOM (lang) {
    var dict = translations[lang] || translations[DEFAULT_LANG]

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n')
      if (dict[key] !== undefined) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.getAttribute('type') !== 'email' || !el.value) {
            // handled by data-i18n-placeholder
          }
        } else {
          el.innerHTML = dict[key]
        }
      }
    })

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder')
      if (dict[key] !== undefined) {
        el.setAttribute('placeholder', dict[key])
      }
    })

    document.querySelectorAll('[data-i18n-value]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-value')
      if (dict[key] !== undefined) {
        el.setAttribute('value', dict[key])
      }
    })

    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title')
      if (dict[key] !== undefined) {
        el.setAttribute('title', dict[key])
      }
    })

    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria')
      if (dict[key] !== undefined) {
        el.setAttribute('aria-label', dict[key])
      }
    })
  }

  /* ─── Currency ─── */
  function applyCurrency (code, initial) {
    if (!currencies[code]) code = DEFAULT_CURRENCY
    currentCurrency = code
    localStorage.setItem(STORAGE_CURRENCY, code)

    var currency = currencies[code]
    var rate = currency.rate
    var symbol = currency.symbol

    document.querySelectorAll('[data-i18n-currency]').forEach(function (el) {
      var amount = parseFloat(el.getAttribute('data-i18n-currency'))
      if (!isNaN(amount)) {
        var converted = (amount * rate).toFixed(0)
        el.textContent = converted
      }
    })

    document.querySelectorAll('[data-i18n-currency-symbol]').forEach(function (el) {
      el.textContent = symbol
    })

    updateCurrencySelector(code)
    if (!initial) animateTransition()
  }

  /* ─── Selector UI ─── */
  function bindSelectors () {
    var langSelect = document.getElementById('langSelect')
    var currencySelect = document.getElementById('currencySelect')

    if (langSelect) {
      langSelect.addEventListener('change', function () {
        applyLang(this.value, false)
      })
      updateLangSelector(currentLang)
    }
    if (currencySelect) {
      currencySelect.addEventListener('change', function () {
        applyCurrency(this.value, false)
      })
      updateCurrencySelector(currentCurrency)
    }
  }

  function updateLangSelector (lang) {
    var sel = document.getElementById('langSelect')
    if (!sel) return
    sel.value = lang
  }

  function updateCurrencySelector (code) {
    var sel = document.getElementById('currencySelect')
    if (!sel) return
    sel.value = code
  }

  /* ─── Smooth transition ─── */
  function animateTransition () {
    var main = document.querySelector('main') || document.body
    main.style.transition = 'opacity 0.15s ease'
    main.style.opacity = '0'
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        main.style.opacity = '1'
      })
    })
  }

  /* ─── Public API ─── */
  var NagrivaI18n = {
    getLang: function () { return currentLang },
    setLang: function (lang) { applyLang(lang, false) },
    getCurrency: function () { return currentCurrency },
    setCurrency: function (code) { applyCurrency(code, false) },
    translate: function (lang) { translateDOM(lang || currentLang) },
    currencies: currencies,
    translations: translations,
  }

  window.NagrivaI18n = NagrivaI18n

  /* ─── Auto-init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
