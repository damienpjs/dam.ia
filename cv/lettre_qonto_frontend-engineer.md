Damien Pasulj
dagobert1992@gmail.com — 06 13 47 94 46
damienpasulj.com — github.com/damienpjs
Pyrénées-Orientales, France, full remote

Subject: application for Senior/Staff Frontend Engineer (React)

Hello,

Moving 1.1 million lines from Ember to React while 600,000 businesses keep working in the product every day is not a rewrite. It is a long series of arbitrations about what gets migrated now and what has to keep running untouched in the meantime. I spent two years doing exactly that, at a smaller scale, and it is the part of the job I like most.

At elloha, I led the rewrite of the core of a booking SaaS used by more than 10,000 tourism professionals, from ASP.NET and C# to React, TypeScript and Next.js. The migration was progressive and there was never a service interruption: you do not take a booking engine offline in July. I defined the architecture and the conventions, worked with three developers at any given time and onboarded around ten over the period, which is where I learned that a convention only survives if it is written down and cheap to follow. Since 2024 I have been Lead Tech at Apizee on a React and TypeScript product, owning the front-end architecture, reviewing code, mentoring three developers and building the GitLab CI/CD pipelines.

You ask for AI fluency with critical judgment, so let me be precise about mine: it is personal work, not something I shipped as an employee. damienpasulj.com is a conversational version of my resume that I built and put online, with a full RAG pipeline behind it and Next.js 16 and React 19 in front. The piece I would defend in an interview is the multi-LLM fallback. When Gemini answers 429 or 503 in the middle of a response, the stream switches over to Groq without losing the tokens already rendered in the browser, and the following request goes back to the primary provider. Coverage is gated at 95% in CI, a constraint I chose to live with.

One line in your posting made me smile: pure CSS, no Tailwind. I wrote stylesheets by hand for years on DotNetNuke and ASP.NET sites, and I had quietly filed that knowledge under obsolete. I am French, I live in the Pyrénées-Orientales and I have worked fully remote for years, so the distance is a habit rather than something to organise. Happy to talk whenever it suits your team.

Damien Pasulj
