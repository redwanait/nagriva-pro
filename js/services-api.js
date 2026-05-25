/* ════════════════════════════════════════════════════════
   NAGRIVA — Services API Layer
   services-api.js
   Fetches service data from Supabase with TTL cache + fallback
   ════════════════════════════════════════════════════════ */

window.ServicesAPI = (function () {
  'use strict';

  var CACHE_TTL = 5 * 60 * 1000;
  var _cache = {};
  var _allCache = null;

  /* ════════════════════════════════════════════════════════
     FALLBACK DATA — embedded so no blocking network request
     ════════════════════════════════════════════════════════ */

  var FALLBACK = {

    'web-design': {
      slug: 'web-design',
      pageTitle: 'Web Design — NAGRIVA',
      metaDescription: 'Premium web design that converts visitors into customers. Modern, fast, and conversion-optimized websites.',
      breadcrumbCurrent: 'Web Design',
      title: 'Premium Web Design That <span class="sp-text-glow">Converts</span>',
      highlights: ['Conversion-Optimized', 'Lightning Fast', 'Mobile-First', 'SEO-Ready'],
      sellerName: 'NAGRIVA Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      gallery: [
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_55%20PM.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_50%20PM.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_45%20PM.png'
      ],
      description: '<p>We build premium, conversion-optimized websites that look stunning and drive measurable growth for your business. Every pixel serves a purpose, every interaction is intentional, and every page is built to convert.</p><p>From sleek landing pages to complex web applications, our designs are crafted to elevate your brand, engage your audience, and deliver results \u2014 fast.</p>',
      benefits: [
        { icon: 'layers', title: 'Conversion Focused', text: 'Data-backed design decisions that turn visitors into customers.' },
        { icon: 'file', title: 'Blazing Fast', text: 'Optimized code, lazy loading, and modern performance practices.' },
        { icon: 'image', title: 'Premium Aesthetic', text: 'Modern, luxurious design that positions your brand at the top.' },
        { icon: 'users', title: 'SEO Optimized', text: 'Built with search engines in mind from day one.' }
      ],
      process: [
        { num: '01', title: 'Discovery & Strategy', text: 'We dive deep into your brand, audience, and goals to craft a strategy that drives results.' },
        { num: '02', title: 'Design & Prototype', text: 'High-fidelity designs with interactive prototypes that bring your vision to life.' },
        { num: '03', title: 'Development & Testing', text: 'Clean, performant code with rigorous testing across devices and browsers.' },
        { num: '04', title: 'Launch & Optimize', text: 'Seamless deployment with ongoing optimization and performance monitoring.' }
      ],
      faq: [
        { question: 'How long does a typical web design project take?', answer: 'Timelines vary based on scope. A standard 5-page website takes 3-4 weeks, while more complex projects can take 6-8 weeks. We\'ll provide a clear timeline during our discovery call.' },
        { question: 'What is included in the price?', answer: 'Each package includes custom design, development, content population, basic SEO setup, and 2 rounds of revisions. Higher-tier packages include additional pages, CMS integration, and dedicated support.' },
        { question: 'Do you offer ongoing maintenance?', answer: 'Yes, we offer monthly maintenance packages to keep your website secure, updated, and performing at its best. Contact us for custom maintenance plans.' },
        { question: 'Will my website be mobile-friendly?', answer: 'Absolutely. Every website we build is fully responsive and optimized for all devices \u2014 from mobile phones to large desktop screens. We test thoroughly across 20+ device configurations.' }
      ],
      results: [
        { num: '50+', label: 'Webships Delivered' },
        { num: '4.2x', label: 'Avg. Conversion Lift' },
        { num: '98%', label: 'Client Satisfaction' },
        { num: '2.8x', label: 'Faster Load Times' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '3,499', delivery: '4-Week Delivery', revisions: '2 Revisions', features: ['5-Page Custom Website', '2 Rounds of Revisions', 'Basic SEO Setup', 'Mobile Responsive', 'Contact Form Integration'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '6,499', delivery: '6-Week Delivery', revisions: 'Unlimited Revisions', features: ['10-Page Custom Website', 'Unlimited Revisions', 'CMS Integration', 'Full SEO Optimization', 'Analytics Dashboard', '30-Day Support'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '12K', delivery: '8-Week Delivery', revisions: 'Unlimited Revisions', features: ['Custom Pages & Features', 'Complete Design System', 'Advanced Animations', 'Dedicated Project Manager', 'Priority Support', '90-Day Maintenance'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '98% Satisfaction' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    seo: {
      slug: 'seo',
      pageTitle: 'SEO Optimization — NAGRIVA',
      metaDescription: 'Data-driven SEO that drives organic growth. Rank higher, get more traffic, and convert better.',
      breadcrumbCurrent: 'SEO',
      title: 'SEO Optimization That <span class="sp-text-glow">Dominates</span> Search',
      highlights: ['Data-Driven', 'White Hat', 'Industry Leading', 'ROI Focused'],
      sellerName: 'NAGRIVA Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      gallery: [
        '../assets/images/projects/SEO%20Optimization.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_55%20PM.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_50%20PM.png'
      ],
      description: '<p>We deliver data-driven SEO strategies that propel your website to the top of search results. Our white-hat approach combines technical expertise, content excellence, and proven link-building tactics to drive sustainable organic growth.</p><p>From comprehensive site audits to ongoing performance monitoring, every tactic is meticulously executed to maximize your ROI and establish your brand as an authority in your industry.</p>',
      benefits: [
        { icon: 'layers', title: 'Data-Driven Strategy', text: 'Comprehensive keyword research and competitive analysis backed by real search data.' },
        { icon: 'file', title: 'Technical SEO', text: 'Site structure optimization, speed enhancements, schema markup, and mobile-first indexing.' },
        { icon: 'image', title: 'Content Optimization', text: 'Authority-building content crafted to rank, engage, and convert your target audience.' },
        { icon: 'clock', title: 'Performance Tracking', text: 'Transparent monthly reports with actionable insights and real-time ranking dashboards.' }
      ],
      process: [
        { num: '01', title: 'Audit & Research', text: 'In-depth site analysis, competitor benchmarking, and high-value keyword discovery to build your roadmap.' },
        { num: '02', title: 'Strategy & Planning', text: 'Custom SEO roadmap with prioritized actions, content calendar, and technical optimization plan.' },
        { num: '03', title: 'Implementation', text: 'On-page optimization, technical fixes, content creation, and quality link building executed with precision.' },
        { num: '04', title: 'Monitoring & Optimization', text: 'Continuous tracking, A/B testing, and iterative improvements to maximize your rankings and ROI.' }
      ],
      faq: [
        { question: 'How long does a typical SEO engagement take?', answer: 'SEO engagements typically run 3-6 months for meaningful results. We recommend a minimum of 6 months to build sustainable organic growth.' },
        { question: 'What deliverables can I expect?', answer: 'You\'ll receive a detailed SEO audit, keyword research report, on-page optimizations, content production, monthly performance reports, and a live ranking dashboard.' },
        { question: 'How long until I see results?', answer: 'Initial improvements can be seen within 4-6 weeks, with significant ranking gains in 3-6 months. SEO compounds over time.' },
        { question: 'Do you provide regular reporting?', answer: 'Yes, you\'ll get monthly performance reports covering rankings, organic traffic, conversions, and key KPIs. Higher tiers include bi-weekly check-ins.' }
      ],
      results: [
        { num: '150+', label: 'Clients Served' },
        { num: '4.8x', label: 'Avg. Traffic Growth' },
        { num: '96%', label: 'Client Retention' },
        { num: '3.2x', label: 'Avg. ROI' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '1,999', delivery: '2-Week Delivery', revisions: '2 Revisions', features: ['Keyword Research', 'On-Page SEO', '10 Keywords', 'Monthly Report', '2 Revisions'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '3,999', delivery: '4-Week Delivery', revisions: 'Unlimited Revisions', features: ['Full SEO Audit', 'On-Page + Off-Page SEO', '25 Keywords', 'Content Strategy', '4 Reports', 'Unlimited Revisions'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '7,999', delivery: '8-Week Delivery', revisions: 'Unlimited Revisions', features: ['Enterprise SEO Strategy', 'Technical + Local SEO', '50+ Keywords', 'Content Production', 'Dedicated Manager', 'Priority Support'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '96% Retention' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    branding: {
      slug: 'branding',
      pageTitle: 'Brand Identity — NAGRIVA',
      metaDescription: 'Strategic brand identity design that makes you memorable, credible, and impossible to ignore.',
      breadcrumbCurrent: 'Brand Identity',
      title: 'Brand Identity That <span class="sp-text-glow">Stands Out</span>',
      highlights: ['Strategic', 'Memorable', 'Premium', 'Consistent'],
      sellerName: 'NAGRIVA Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      gallery: [
        '../assets/images/projects/Brand%20Identity.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_55%20PM.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_50%20PM.png'
      ],
      description: '<p>We craft strategic brand identities that make you unforgettable. From logos and color palettes to complete visual systems and brand guidelines \u2014 every element is designed to communicate your unique value, connect with your audience, and set you apart from the competition.</p><p>Whether you\'re launching a new brand or evolving an existing one, our comprehensive approach ensures consistency, credibility, and impact across every touchpoint.</p>',
      benefits: [
        { icon: 'clockAlt', title: 'Strategic Positioning', text: 'We define your brand\'s unique market position to differentiate and dominate.' },
        { icon: 'layers', title: 'Visual Identity System', text: 'Cohesive logos, colors, typography, and imagery that tell your story.' },
        { icon: 'fileText', title: 'Brand Guidelines', text: 'Comprehensive rules to ensure consistency across every touchpoint.' },
        { icon: 'usersPlus', title: 'Market Differentiation', text: 'Stand out with a distinct brand personality that customers remember and trust.' }
      ],
      process: [
        { num: '01', title: 'Discovery & Research', text: 'We dive into your industry, competitors, audience, and vision to uncover your brand\'s core identity.' },
        { num: '02', title: 'Brand Strategy', text: 'Define positioning, messaging, personality, and visual direction that aligns with your goals.' },
        { num: '03', title: 'Visual Identity', text: 'Craft logo, color palette, typography, and visual system with precision and purpose.' },
        { num: '04', title: 'Brand Guidelines', text: 'Deliver a comprehensive guide for consistent brand recognition across all channels.' }
      ],
      faq: [
        { question: 'How long does a branding project take?', answer: 'Starter packages take approximately 2 weeks, Growth packages 4 weeks, and Scale packages 6 weeks. We provide a detailed timeline during your discovery call.' },
        { question: 'What\'s included in the branding packages?', answer: 'Every package includes logo design, color palette, typography, and brand board. Higher tiers add guidelines, stationery, iconography, brand strategy, and dedicated management.' },
        { question: 'What\'s the difference between a logo and a full brand identity?', answer: 'A logo is one element of your brand. Full brand identity includes logos, color systems, typography, imagery style, brand voice, guidelines, and applications.' },
        { question: 'How many revisions can I request?', answer: 'Starter packages include 2 rounds of revisions. Growth and Scale packages include unlimited revisions until you\'re satisfied.' }
      ],
      results: [
        { num: '80+', label: 'Brands Built' },
        { num: '3.5x', label: 'Brand Recognition' },
        { num: '94%', label: 'Client Retention' },
        { num: '4.9', label: 'Star Avg. Rating' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '2,499', delivery: '2-Week Delivery', revisions: '2 Revisions', features: ['Logo Design', 'Color Palette', 'Typography', 'Brand Board', '2 Concepts'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '4,999', delivery: '4-Week Delivery', revisions: 'Unlimited Revisions', features: ['Full Identity Package', 'Logo + Variations', 'Brand Guidelines', 'Stationery', '4 Concepts', 'Unlimited Revisions'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '8,999', delivery: '6-Week Delivery', revisions: 'Unlimited Revisions', features: ['Complete Brand System', 'Guidelines Book', 'Brand Strategy', 'Iconography', 'Web Assets', 'Dedicated Manager + Priority Support'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '94% Retention' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    'ai-automation': {
      slug: 'ai-automation',
      pageTitle: 'AI Automation — NAGRIVA',
      metaDescription: 'AI-powered automation that streamlines your business. Save time, reduce costs, and scale faster with intelligent workflows.',
      breadcrumbCurrent: 'AI Automation',
      title: 'AI Automation That <span class="sp-text-glow">Transforms</span> Workflows',
      highlights: ['Smart Automation', 'Custom AI', 'Scalable', 'Future-Ready'],
      sellerName: 'NAGRIVA Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      gallery: [
        '../assets/images/projects/AI%20Automation.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_55%20PM.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_50%20PM.png'
      ],
      description: '<p>We build intelligent AI automation systems that eliminate repetitive tasks, streamline complex workflows, and unlock new levels of efficiency for your business. From custom AI agents to enterprise-grade pipelines, every solution is designed to scale with you.</p><p>Whether you need to automate data processing, integrate smart chatbots, or build a fully autonomous operational layer \u2014 our AI engineers deliver future-ready systems that drive real results.</p>',
      benefits: [
        { icon: 'clockAlt', title: 'Workflow Automation', text: 'End-to-end automation that connects your tools and eliminates manual busywork.' },
        { icon: 'layers', title: 'Intelligent Processing', text: 'AI-powered data extraction, classification, and decision-making at scale.' },
        { icon: 'search', title: 'Custom Integrations', text: 'Seamless API connections to your existing stack \u2014 CRM, ERP, email, and more.' },
        { icon: 'users', title: '24/7 Operation', text: 'Your automation runs around the clock \u2014 no breaks, no downtime, no limits.' }
      ],
      process: [
        { num: '01', title: 'Process Analysis', text: 'Map current operations, identify bottlenecks, and pinpoint high-impact automation opportunities.' },
        { num: '02', title: 'Solution Design', text: 'Architecture blueprints, workflow diagrams, and AI model selection tailored to your needs.' },
        { num: '03', title: 'Implementation', text: 'Rapid build and integration with rigorous testing at every stage of development.' },
        { num: '04', title: 'Training & Scale', text: 'Team onboarding, performance monitoring, and iterative optimization for maximum impact.' }
      ],
      faq: [
        { question: 'How do you integrate AI into existing workflows?', answer: 'We conduct a deep audit of your current processes, then design custom AI pipelines that connect seamlessly via APIs to your existing tools.' },
        { question: 'Is my data secure with your AI systems?', answer: 'Enterprise-grade encryption, role-based access control, and GDPR/SOC 2 compliance. Your data never leaves your infrastructure unless configured.' },
        { question: 'Do you build custom AI or use templates?', answer: 'Every solution is custom-built for your specific use case, tailored to your unique business requirements and challenges.' },
        { question: 'What kind of support do you provide after launch?', answer: 'Comprehensive training, documentation, and a dedicated support channel. Higher tiers include ongoing monitoring and 24/7 priority support.' }
      ],
      results: [
        { num: '60+', label: 'Automations Delivered' },
        { num: '12x', label: 'Efficiency Boost' },
        { num: '99.9%', label: 'Uptime Guarantee' },
        { num: '$2M+', label: 'Client Savings' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '3,999', delivery: '3-Week Delivery', revisions: '2 Revisions', features: ['Process Analysis', 'Basic Automation', '1 Integration', 'Workflow Design', '2 Revisions'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '7,999', delivery: '6-Week Delivery', revisions: 'Unlimited Revisions', features: ['Multi-Process Automation', '3 Integrations', 'Custom AI Agent', 'Dashboard', 'Training', 'Unlimited Revisions'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '15K', delivery: '10-Week Delivery', revisions: 'Unlimited Revisions', features: ['Enterprise Automation', 'Unlimited Integrations', 'Full AI System', 'Dedicated Infrastructure', '24/7 Support', 'Priority Delivery'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '99.9% Uptime' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    'social-media': {
      slug: 'social-media',
      pageTitle: 'Social Media Growth — NAGRIVA',
      metaDescription: 'Social media growth that amplifies your brand. Organic and paid strategies to build community, drive engagement, and scale followers.',
      breadcrumbCurrent: 'Social Media',
      title: 'Social Media Growth That <span class="sp-text-glow">Amplifies</span> Your Brand',
      highlights: ['Organic Growth', 'Paid Strategy', 'Content Led', 'Engagement Driven'],
      sellerName: 'NAGRIVA Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      gallery: [
        '../assets/images/projects/Social%20Media%20Growth.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_55%20PM.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_50%20PM.png'
      ],
      description: '<p>We build social media growth systems that amplify your brand\'s voice and drive measurable engagement. From organic content strategies to paid ad campaigns, every move is data-informed and results-driven.</p><p>Whether you\'re launching a new presence or scaling an existing community, our strategies are designed to grow your following, boost engagement, and deliver a real return on your social investment.</p>',
      benefits: [
        { icon: 'edit', title: 'Content Strategy', text: 'Data-backed content calendars and creative direction tailored to your brand voice.' },
        { icon: 'users', title: 'Community Management', text: 'Active engagement with your audience to build loyalty and drive conversations.' },
        { icon: 'image', title: 'Paid Advertising', text: 'Targeted ad campaigns optimized for reach, engagement, and conversions.' },
        { icon: 'file', title: 'Analytics & Reporting', text: 'Transparent monthly reports with insights and recommendations for continuous growth.' }
      ],
      process: [
        { num: '01', title: 'Audit & Strategy', text: 'Analyze current presence, audience, and competitors to build a custom growth roadmap.' },
        { num: '02', title: 'Content Creation', text: 'High-quality visuals, copy, and media designed to stop the scroll and spark engagement.' },
        { num: '03', title: 'Community Engagement', text: 'Daily monitoring, replies, and proactive interaction to build a loyal following.' },
        { num: '04', title: 'Optimize & Scale', text: 'Data-driven optimization and scaling of what works to maximize reach and results.' }
      ],
      faq: [
        { question: 'Which social media platforms do you manage?', answer: 'We manage all major platforms including Instagram, TikTok, LinkedIn, Twitter/X, Facebook, and YouTube, tailored to your brand.' },
        { question: 'Do you create the content or do I provide it?', answer: 'We handle full content creation including graphics, copywriting, video editing, and motion design. We can also work with your existing assets.' },
        { question: 'How long before I see results?', answer: 'Measurable engagement growth within 4-6 weeks. Significant follower and conversion growth in 2-3 months.' },
        { question: 'Do you provide detailed reports?', answer: 'Yes, every package includes a monthly performance report with key metrics, growth trends, content analysis, and recommendations.' }
      ],
      results: [
        { num: '200+', label: 'Campaigns Run' },
        { num: '5.6x', label: 'Engagement Rate' },
        { num: '150K+', label: 'Followers Grown' },
        { num: '4.2x', label: 'Avg. ROAS' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '1,499', delivery: '2-Week Delivery', revisions: '2 Revisions', features: ['Content Calendar', '8 Posts/Month', 'Hashtag Strategy', 'Monthly Report', '2 Revisions'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '3,499', delivery: '4-Week Delivery', revisions: 'Unlimited Revisions', features: ['Full Management', '16 Posts/Month', 'Stories + Reels', 'Community Engagement', 'Paid Ads Setup', 'Unlimited Revisions'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '6,999', delivery: '6-Week Delivery', revisions: 'Unlimited Revisions', features: ['Complete Growth System', '30+ Posts/Month', 'Full Ad Management', 'Influencer Strategy', 'Dedicated Manager', 'Priority Support'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '5.6x Engagement' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    strategy: {
      slug: 'strategy',
      pageTitle: 'Performance Marketing — NAGRIVA',
      metaDescription: 'Data-driven performance marketing that delivers measurable ROI. Full-funnel campaigns across all channels, optimized for conversions.',
      breadcrumbCurrent: 'Performance Marketing',
      title: 'Performance Marketing That <span class="sp-text-glow">Delivers</span> ROI',
      highlights: ['Data-Driven', 'Full Funnel', 'Multi-Channel', 'ROI Guaranteed'],
      sellerName: 'NAGRIVA Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      gallery: [
        '../assets/images/projects/Performance%20Marketing.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_55%20PM.png',
        '../assets/images/projects/ChatGPT%20Image%20May%2018%2C%202026%2C%2007_30_50%20PM.png'
      ],
      description: '<p>We build data-driven performance marketing campaigns that deliver measurable ROI across every channel. From paid media strategy to conversion optimization, every dollar is tracked, optimized, and scaled for maximum impact.</p><p>Our full-funnel approach ensures your brand reaches the right audience at every stage \u2014 from awareness to conversion \u2014 with real-time analytics driving every decision.</p>',
      benefits: [
        { icon: 'layers', title: 'Paid Media Strategy', text: 'Strategic ad placements across Google, Meta, LinkedIn, and more for maximum ROI.' },
        { icon: 'file', title: 'Conversion Optimization', text: 'Landing pages, funnels, and creative refined through continuous A/B testing.' },
        { icon: 'image', title: 'Multi-Channel Campaigns', text: 'Integrated campaigns across search, social, display, and programmatic channels.' },
        { icon: 'users', title: 'Real-Time Analytics', text: 'Live dashboards with actionable insights and transparent performance reporting.' }
      ],
      process: [
        { num: '01', title: 'Market Research', text: 'In-depth audience analysis, competitor benchmarking, and channel selection for maximum impact.' },
        { num: '02', title: 'Campaign Strategy', text: 'Data-backed architecture with tailored messaging, budget allocation, and creative direction.' },
        { num: '03', title: 'Execution & Testing', text: 'Rigorous A/B testing across audiences, creatives, and placements to find winning combinations.' },
        { num: '04', title: 'Scale & Optimize', text: 'Continuous optimization and budget scaling based on real-time performance and ROAS targets.' }
      ],
      faq: [
        { question: 'Which advertising channels do you work with?', answer: 'Google Ads, Meta (Facebook/Instagram), LinkedIn, TikTok, Pinterest, and programmatic networks.' },
        { question: 'What is the minimum ad budget required?', answer: 'A minimum monthly ad spend of $2,000 is recommended. Packages start at $2,499 for management fees; ad spend is billed separately.' },
        { question: 'How do you track and attribute conversions?', answer: 'We use multi-touch attribution models with Google Tag Manager, server-side tracking, and CRM integration.' },
        { question: 'What does your reporting cadence look like?', answer: 'Weekly performance snapshots and comprehensive monthly reports. Enterprise clients get real-time dashboard access and weekly strategy calls.' }
      ],
      results: [
        { num: '300+', label: 'Campaigns Managed' },
        { num: '6.2x', label: 'Avg. ROAS' },
        { num: '95%', label: 'Client Retention' },
        { num: '$10M+', label: 'Ad Spend Managed' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '2,499', delivery: '2-Week Delivery', revisions: '2 Revisions', features: ['Channel Strategy', 'Ad Creative', '1 Platform', 'Basic Tracking', 'Monthly Report', '2 Revisions'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '4,999', delivery: '4-Week Delivery', revisions: 'Unlimited Revisions', features: ['Full Funnel Strategy', '3 Platforms', 'Audience Research', 'A/B Testing', 'Analytics Dashboard', 'Unlimited Revisions'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '9,999', delivery: '6-Week Delivery', revisions: 'Unlimited Revisions', features: ['Enterprise Growth', 'All Platforms', 'Custom Attribution', 'Dedicated Team', '24/7 Optimization', 'Priority Support'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '6.2x Avg. ROAS' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    }
  };

  /* ════════════════════════════════════════════════════════
     TRANSFORM: Supabase row (snake_case) → Renderer shape (camelCase)
     ════════════════════════════════════════════════════════ */

  function _parseJSON(val) {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val || [];
  }

  function _fixUnicode(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    });
  }

  function _transformRow(row) {
    if (!row) return null;
    return {
      slug: row.slug || '',
      pageTitle: row.meta_title || row.title + ' — NAGRIVA',
      metaDescription: row.meta_description || row.short_description || '',
      breadcrumbCurrent: row.title || '',
      title: row.hero_title || row.title || '',
      highlights: _parseJSON(row.highlights),
      sellerName: row.seller_name || 'NAGRIVA Agency',
      sellerLabel: _fixUnicode(row.seller_label) || 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: row.rating || 4.9,
      reviewCount: row.review_count || 128,
      satisfaction: row.satisfaction || 98,
      gallery: _parseJSON(row.gallery),
      description: row.description || row.full_description || '',
      benefits: _parseJSON(row.benefits),
      process: _parseJSON(row.process),
      faq: _parseJSON(row.faq),
      results: _parseJSON(row.results),
      packages: _parseJSON(row.packages),
      trustItems: _parseJSON(row.trust_items)
    };
  }

  /* ════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════ */

  function fetchService(slug) {
    // Escape hatch: allow direct injection from server-side render
    if (window.__SUPABASE_SERVICE_DATA) {
      return Promise.resolve(window.__SUPABASE_SERVICE_DATA);
    }

    var now = Date.now();

    // Check cache
    if (_cache[slug] && now - _cache[slug].ts < CACHE_TTL) {
      return Promise.resolve(_cache[slug].data);
    }

    // If Supabase client is not available, fall back immediately
    if (!window.supabaseClient) {
      return Promise.resolve(FALLBACK[slug] || FALLBACK['web-design']);
    }

    return window.supabaseClient
      .from('services')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) {
          return FALLBACK[slug] || FALLBACK['web-design'];
        }
        var transformed = _transformRow(res.data);
        _cache[slug] = { data: transformed, ts: now };
        return transformed;
      })
      .catch(function () {
        return FALLBACK[slug] || FALLBACK['web-design'];
      });
  }

  function getAllServices() {
    var now = Date.now();

    if (_allCache && now - _allCache.ts < CACHE_TTL) {
      return Promise.resolve(_allCache.data);
    }

    if (!window.supabaseClient) {
      var all = Object.keys(FALLBACK).map(function (k) { return FALLBACK[k]; });
      return Promise.resolve(all);
    }

    return window.supabaseClient
      .from('services')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          var all = Object.keys(FALLBACK).map(function (k) { return FALLBACK[k]; });
          return all;
        }
        var transformed = res.data.map(_transformRow);
        _allCache = { data: transformed, ts: now };
        return transformed;
      })
      .catch(function () {
        var all = Object.keys(FALLBACK).map(function (k) { return FALLBACK[k]; });
        return all;
      });
  }

  return {
    fetchService: fetchService,
    getAllServices: getAllServices
  };
})();
