# Publishing, phone and copyright notes

A summary of what came up while building this site. None of the phone or
publishing steps have been done yet. This is general information, not legal
advice.

## Copyright: what's OK

- The CSW24 word list is owned by Collins (HarperCollins).
- **Having it and studying with it is fine.** Copyright is about copying and
  sharing, not owning a copy. Your Zyzzyva copy (`~/Zyzzyva/lexicons/CSW24.db`)
  is meant for exactly this kind of personal use.
- **Sharing it publicly is the problem.** That covers a public GitHub repo, a
  public website, or an app that includes the list.
- **Rules for this project:**
  - Keep the GitHub repo **private**.
  - `words.js` (the full word list) is in `.gitignore` and never committed.
    Rebuild it on any computer with `python3 build.py`.
  - Don't host the site publicly with `words.js` included.

### How other sites and apps do it

- **Licensed:** Woogles, Zyzzyva, the official Collins app and tournament
  software use the list with permission from Collins, usually through Scrabble
  associations or a paid deal.
- **Unlicensed:** some sites just post the list. Collins tends to send takedown
  requests, but it isn't legal.
- **Bring your own list:** some tools never ship the list and make each user
  load their own licensed copy. This site works that way. The code could be
  shared, and each person builds their own `words.js`.

## Who can see the repo

- Your Claude account and GitHub account aren't connected. Other people using
  the same Claude account can't see the repo through Claude.
- The private repo `github.com/alecscappa/csw24-word-study` is visible only to
  the `alecscappa` GitHub account and anyone you invite.
- Anyone using your logged-in Mac could see your files, as with anything on it.

## Getting it on your phone

**Best option: a private website plus "Add to Home Screen" (free).**

- Put the site online, open it in your phone's browser, and use "Add to Home
  Screen". It gets its own icon and opens full-screen like an app.
- It can be made to work offline (a PWA).
- **It must be private** because of the word list. Put it behind a login only
  you can use. Cloudflare can do this for free, limited to your email address
  (Cloudflare Access).
- **GitHub Pages won't work.** Those sites are always public.

**A real app store app: not recommended.**

- Apple charges $99 a year for a developer account, and Google charges $25 once.
- Putting the Collins list in an app store needs a licence from Collins.

**The word data wouldn't need to change.** It still comes from your Zyzzyva
database through `build.py`. One suggested improvement: shrink the 22 MB
`words.js` and have the phone save it after the first load. That way it opens
fast and doesn't use mobile data every time.

## Finding the Claude conversation again

The conversation that built this site was started from the home folder. To
reopen it, run:

```
cd ~ && claude --resume 0daa6281-eaf1-46ca-910f-4d3777f8bb95
```

`/resume` only lists conversations started in the folder you're in.
