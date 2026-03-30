[Sitemap](https://medium.com/sitemap/sitemap.xml)

[Open in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3DmobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2F%40mttpla%2Fusing-obsidian-as-an-adr-tool-5f63d187de6b&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)

Get app

[Write](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)

[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2F%40mttpla%2Fusing-obsidian-as-an-adr-tool-5f63d187de6b&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

# Using Obsidian as an ADR Tool

[![Matteo Paoli](https://miro.medium.com/v2/resize:fill:32:32/1*huIKvy4D-TE4s_5W6rqFhQ.jpeg)](https://medium.com/@mttpla?source=post_page---byline--5f63d187de6b---------------------------------------)

[Matteo Paoli](https://medium.com/@mttpla?source=post_page---byline--5f63d187de6b---------------------------------------)

Follow

5 min read

·

Mar 9, 2024

6

1

[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3D5f63d187de6b&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40mttpla%2Fusing-obsidian-as-an-adr-tool-5f63d187de6b&source=---header_actions--5f63d187de6b---------------------post_audio_button------------------)

Share

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:1000/0*ruorpT6jsWD-XB6N)

Photo by [Rapha Wilde](https://unsplash.com/@veloradio?utm_source=medium&utm_medium=referral) on [Unsplash](https://unsplash.com/?utm_source=medium&utm_medium=referral)

In the world of software development, Architecture Decision Records (ADRs) serve as vital documentation for capturing architectural decisions made during the software development lifecycle. While existing tools and templates to create ADRs are already available, leveraging Obsidian can significantly enhance the efficiency of this process.

In this article is about how to configure Obsidian to serve as an effective ADR tool, including setting up templates, integrating with version control using Git, and leveraging its graph view to visualize architectural decisions.

## What are ADRs?

Architecture Decision Records (ADRs) document the key decisions made regarding the architecture of a software system. They provide insights into the reasoning behind architectural choices, aiding in understanding the evolution of the system over time. Various tools and templates are available to create ADRs, with some popular options including Markdown templates or specialized ADR tools, like [https://github.com/npryce/adr-tools](https://github.com/npryce/adr-tools).

For further information on ADRs and related tools, you may refer to the official page:

[**Architectural Decision Records (ADRs)** \\
\\
**An Architectural Decision (AD) is a justified design choice that addresses a functional or non-functional requirement…**\\
\\
adr.github.io](https://adr.github.io/?source=post_page-----5f63d187de6b---------------------------------------)

Interesting article on medium.com about the ADR can be found below:

[**What is ADR? Do I need it? How is it useful?** \\
\\
**Architecture Decision Record is a term I had started hearing a lot recently. Maybe it's my interest which started me…**\\
\\
medium.com](https://medium.com/@naveenatmakur/what-is-adr-do-i-need-it-how-is-it-useful-b5f9802db56f?source=post_page-----5f63d187de6b---------------------------------------)

[**Basics of Architecture Decision Records (ADR)** \\
\\
**This article provides an explanation of an ADR and highlights ADR structure & benefits. It also outlines the approach…**\\
\\
medium.com](https://medium.com/@nolomokgosi/basics-of-architecture-decision-records-adr-e09e00c636c6?source=post_page-----5f63d187de6b---------------------------------------)

[**Architecture decision records (ADRs)** \\
\\
**ADRs document architecturally significant decisions made over time**\\
\\
icepanel.medium.com](https://icepanel.medium.com/architecture-decision-records-adrs-5c66888d8723?source=post_page-----5f63d187de6b---------------------------------------)

## What is Obsidian?

Obsidian is a powerful note-taking and knowledge management tool that relies on a local Markdown-based vault. It offers extensive customization options, allowing users to create custom templates tailored to their specific needs. This feature is extremely valuable for structuring and organizing notes efficiently.

Moreover, Obsidian simplifies the process of creating new notes with its “new unique note” feature. This feature enables users to effortlessly generate fresh documents using a selected template.

See below the Obsidian official site:

[**Obsidian - Sharpen your thinking** \\
\\
**Obsidian is the private and flexible note‑taking app that adapts to the way you think.**\\
\\
obsidian.md](https://obsidian.md/?source=post_page-----5f63d187de6b---------------------------------------)

An article with many useful links about Obsidian, serving as a great starting point to explore all of Obsidian’s features and plugins:

[**Use Obsidian Like a Pro** \\
\\
**Hey! If you’re here, you know what is Obsidian. And you know how messy Obsidian can be if you don’t set up an efficient…**\\
\\
medium.com](https://medium.com/@estebanthi/use-obsidian-like-a-pro-3946cd68cca0?source=post_page-----5f63d187de6b---------------------------------------)

Thanks to

[Esteban Thilliez](https://medium.com/u/24babe9bccb4?source=post_page---user_mention--5f63d187de6b---------------------------------------)

for the valuable contributions.

## Your first ADR template

Following the _Setting Up Your Obsidian Environmen_ t step section below, you will reach this final ADR:

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*OYyHNy932XK5UDv6-d0Spg.png)

Let’s now walk through all the steps and configurations required.

## Get Matteo Paoli’s stories in your inbox

Join Medium for free to get updates from this writer.

Subscribe

Subscribe

Remember me for faster sign in

A quick note: the ADR ID is not a number, as suggested, but in the proposed template it is the current date . Each time you create a new ADRs a the day will be increased by one to be unique.

## Visualize your ADRs in the graph

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*SroJhXw_umRCLl8moUvJ0Q.png)

In the Graph view, you can visualize all ADRs along with their interrelations. This feature stands out as my favorite and I find it incredibly valuable and distinctive from other ADR tools.

## Setting Up Your Obsidian Environment

For this article refers to version 1.5.8 of Obsidian, which is the current version available on Homebrew.

### Steps:

- Obtain obsidian: I have installed Obsidian using Homebrew, but it’s also available for all platforms. You can download it from [here](https://obsidian.md/download).
- Create the Vault: Upon startup, Obsidian prompts you to create a vault. Choose a name and location for your vault. Feel free to select a name of your preference. As for the location, I recommend selecting a path within your project’s Git folder, such as a ‘docs’ folder. For more details and advice, refer to the _Git Recommendations_ below.
- Create the Template Folder: I have named mine ‘obsidian\_template’ and placed it in the root directory.
- Create the ADR folder.
- Add Your Template: I have added a file named ‘ADR template’ with the following structure:

```

---
Title:
Status: proposed, accepted, rejected, deprecated, superseded
Superseded by:
Date: "{{date:YYYY-MM-DD}} {{time:HH:mm}}"
tags:
---

# Context:

# Decision:

# Consequences:
```

Feel free to tailor the template to your team’s needs by adding or removing text or selections as necessary.

- Enable the _Templates_ and the _Unique note creator_ in _Core plugins:_

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*2qFCQY1PvVG87UYMHRQ0Iw.png)

- Set the template folder location in Templates:

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*Fn5rncGETnxO5Quf3GOt8g.png)

- Configure the _Unique Note Creator_:

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*AgFZ6SMrmoyHjwkN8oYuUw.png)

In the text area of _Template file location_ set the template path. In the example above, it is _osidian\_template/ADR template._

Once finished, you’ll now see the _create new unique note_ button, and clicking on it, the ADR file will be created with the template shown at the beginning of the article.

![](https://miro.medium.com/v2/resize:fit:442/1*TK9AXXU9vbQkqJOWMFQn2A.png)

## Git Recommendations

Tracking, preserving, and accessing the history of Architecture Decision Records (ADRs) is paramount. One advisable approach is to establish the vault within a Git repository. Obsidian generates its configuration files within the `.obsidian` folder, which includes the following list:

- `app.json`
- `appearance.json`
- `core-plugins-migration.json`
- `core-plugins.json`
- `graph.json`
- `hotkeys.json`
- `templates.json`
- `workspace.json`
- `zk-prefixer.json`

It is advisable to commit all of these files to ensure that all team members have access to Obsidian’s settings. Alternatively, if you choose to add `.obsidian` to `.gitignore`, each team member will need to follow the provided guidelines and maintain synchronization of the settings accordingly.

Thank you for taking the time to read this article. I hope the information provided has been helpful in understanding how Obsidian can be effectively utilized in managing Architecture Decision Records. If you have any further questions or wish to report any inaccuracies, please feel free to reach out to me. I’m more than happy to provide additional details or clarifications.

[Adr](https://medium.com/tag/adr?source=post_page-----5f63d187de6b---------------------------------------)

[Obsidian](https://medium.com/tag/obsidian?source=post_page-----5f63d187de6b---------------------------------------)

[Software Architecture](https://medium.com/tag/software-architecture?source=post_page-----5f63d187de6b---------------------------------------)

[![Matteo Paoli](https://miro.medium.com/v2/resize:fill:48:48/1*huIKvy4D-TE4s_5W6rqFhQ.jpeg)](https://medium.com/@mttpla?source=post_page---post_author_info--5f63d187de6b---------------------------------------)

[![Matteo Paoli](https://miro.medium.com/v2/resize:fill:64:64/1*huIKvy4D-TE4s_5W6rqFhQ.jpeg)](https://medium.com/@mttpla?source=post_page---post_author_info--5f63d187de6b---------------------------------------)

Follow

[**Written by Matteo Paoli**](https://medium.com/@mttpla?source=post_page---post_author_info--5f63d187de6b---------------------------------------)

[5 followers](https://medium.com/@mttpla/followers?source=post_page---post_author_info--5f63d187de6b---------------------------------------)

· [5 following](https://medium.com/@mttpla/following?source=post_page---post_author_info--5f63d187de6b---------------------------------------)

[https://www.linkedin.com/in/matteo-paoli-6014524/](https://www.linkedin.com/in/matteo-paoli-6014524/)

Follow

## Responses (1)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

Write a response

[What are your thoughts?](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40mttpla%2Fusing-obsidian-as-an-adr-tool-5f63d187de6b&source=---post_responses--5f63d187de6b---------------------respond_sidebar------------------)

Cancel

Respond

[![Mikeblaney](https://miro.medium.com/v2/resize:fill:32:32/0*FT4jz5kwuVCkws9U)](https://medium.com/@mikeblaney79?source=post_page---post_responses--5f63d187de6b----0-----------------------------------)

[Mikeblaney](https://medium.com/@mikeblaney79?source=post_page---post_responses--5f63d187de6b----0-----------------------------------)

[Mar 16, 2024](https://medium.com/@mikeblaney79/adrs-are-an-important-technique-to-understand-the-path-taken-on-the-development-journey-b5706d4c0e45?source=post_page---post_responses--5f63d187de6b----0-----------------------------------)

```
ADR’s are an important technique to understand the path taken on the development journey. When done correctly, it serves as a guide to where that development journey can go. Understanding the past enables us to better understand the future. This…more
```

Reply

## Recommended from Medium

[See more recommendations](https://medium.com/?source=post_page---read_next_recirc--5f63d187de6b---------------------------------------)

[Help](https://help.medium.com/hc/en-us?source=post_page-----5f63d187de6b---------------------------------------)

[Status](https://status.medium.com/?source=post_page-----5f63d187de6b---------------------------------------)

[About](https://medium.com/about?autoplay=1&source=post_page-----5f63d187de6b---------------------------------------)

[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----5f63d187de6b---------------------------------------)

[Press](mailto:pressinquiries@medium.com)

[Blog](https://blog.medium.com/?source=post_page-----5f63d187de6b---------------------------------------)

[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----5f63d187de6b---------------------------------------)

[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----5f63d187de6b---------------------------------------)

[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----5f63d187de6b---------------------------------------)

[Text to speech](https://speechify.com/medium?source=post_page-----5f63d187de6b---------------------------------------)

reCAPTCHA

Recaptcha requires verification.

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)

protected by **reCAPTCHA**

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)