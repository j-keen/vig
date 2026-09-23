# DesignPoke

바이브 코딩 중에 버튼·글자·색·여백을 페이지에서 직접 바꾸고, 그 의도를 AI에게 붙여넣을 수 있게 복사하는 도구입니다. VisBug 포크입니다.

**도구와 단축키**

| 키 | 도구 |
| --- | --- |
| `g` | 안내선 |
| `l` | 선택 / 이동 (기본) — 드래그 이동, 핸들 크기 조절, 방향키 |
| `m` | 바깥 여백 |
| `p` | 안쪽 여백 |
| `a` | Flex 정렬 |
| `v` | DOM 이동 |
| `e` | 텍스트 편집 (아무 글자나 더블클릭해도 진입) |
| `f` | 글꼴 (크기·굵기·정렬·자간) |
| `h` | 색상 (글자/배경/테두리) |
| `c` | AI로 복사 (`Alt`+클릭이면 이력 초기화) |
| `Alt+S` | 화면 캡처 |
| `Ctrl+Z` / `Cmd+Z` | 실행 취소 |
| `Ctrl+K` | 선택 요소에 자연어 메모 (AI 복사에 포함) |
| `Shift+H` | 선택 핸들 숨기기 |
| `\` | 원본 보기 토글 |
| `Esc` | 선택 해제, 선택 없으면 툴바 닫기 |

**전체 매뉴얼:** [docs/MANUAL.md](docs/MANUAL.md)

**사용 흐름:** 요소를 선택 → 드래그·단축키·더블클릭으로 조정 → `c` 또는 AI로 복사 → 채팅/에디터에 붙여넣기.

**개발/빌드:** `npm install` → `npm run build:ext` → `chrome://extensions`에서 `extension/` 폴더를 압축해제 로드합니다. **테스트:** `npm run test:e2e`

**알려진 제한:** 히스토리 패널의 이미지 복사는 secure context에서만 됩니다 (`https` 또는 `http://localhost` / `127.0.0.1`). 일반 `http://` 사이트에서는 `ClipboardItem`이 없어 이미지 복사가 실패합니다. `chrome://` 같은 특수 페이지에는 주입되지 않습니다.

---

<p align="center">
  <img src="./assets/visbug.png" width="300" height="300" alt="visbug">
  <br>
  <a href="https://travis-ci.org/GoogleChromeLabs/ProjectVisBug"><img src="https://travis-ci.org/GoogleChromeLabs/ProjectVisBug.svg?branch=master" alt="travis build status"></a>
  <a href="https://chrome.google.com/webstore/detail/visbug/cdockenadnadldjbbgcallicgledbeoc?hl=en"><img src="https://badgen.net/chrome-web-store/users/cdockenadnadldjbbgcallicgledbeoc"></a>
  <a href="https://chrome.google.com/webstore/detail/visbug/cdockenadnadldjbbgcallicgledbeoc?hl=en"><img src="https://badgen.net/chrome-web-store/stars/cdockenadnadldjbbgcallicgledbeoc"></a>
</p>

# 「VisBug」

> Open source web design debug tools

- Point, click & tinker
- Hold shift and **multi-select**
- Edit **any page** in **any state**
- **Hover inspect** styles, accessibility and alignment
- **Nitpick** layouts & content, **in the real end environment**, at any device size
- **Leverage** design tool nudging skills
- **Edit** any text
- **Replace** image(s)
- Traverse DOM like groups & layers in Sketch
- Design **within the chaos** of production or prototypes and the **odd states** they produce
- Bugs become **design opportunities**
- Design **while simulating:** latency, translation, media queries, platform constraints, orientation, screensize, etc
- **Make more decisions** on the front end of your site/app (a11y, responsive, edge cases, etc)


**No waiting** for developers to expose their legos, **just go direct** and edit the end state (regardless of framework) and **execute/test an idea**

<br>
<br>
<br>

<h3 style="font-weight:300; max-width: 40ch;"><b>Give power</b> to designers & content creators power within the web project they have today, <b>by bringing design tool interactions</b> to the browser.</h3>

<br>
<br>
<br>

Check out the [list of features me and other's are wishing for](https://github.com/GoogleChromeLabs/ProjectVisBug/issues?q=is%3Aopen+is%3Aissue+label%3A%22%E2%9A%A1%EF%B8%8F+feature%22). There's a lot of fun stuff planned or in demand. Cast your vote on a feature, leave some feedback or add clarity. 

Let's do this **design community, I'm looking at you!** Make a GitHub account and start dreamin' in the [issues area!](https://github.com/GoogleChromeLabs/ProjectVisBug/issues) **Help create the tool you need to do your job better.**


## 🤔 **It's not:**
-   **A competitor** to design authoring tools like Figma, Sketch, XD, etc; **it's a complement!**
-   Something you would use **to start from scratch**
-   A **design system recognizer**, enforcer, enabler, etc.. but it is a **design system leverager!**
-   An **interaction** prototyping tool, you need to produce the states for VisBug to design against

<br>
<br>
<br>

## Installation

### Add to your browser
[Chrome Extension](https://chrome.google.com/webstore/detail/cdockenadnadldjbbgcallicgledbeoc)  
[Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/visbug/)  
[Safari Extension](https://apps.apple.com/app/id1538509686)  
[Edge Extension](https://microsoftedge.microsoft.com/addons/detail/visbug/kdmdoinnkaeognnpegpkepdnggeaodkn)  

### Getting Started
[Check the Wiki](https://github.com/GoogleChromeLabs/ProjectVisBug/wiki)  
[Master List of Keyboard Commands](https://github.com/GoogleChromeLabs/ProjectVisBug/wiki/Keyboard-Master-List)  
[Open Feature Requests](https://github.com/GoogleChromeLabs/ProjectVisBug/issues?q=is%3Aopen+is%3Aissue+label%3A%22%E2%9A%A1%EF%B8%8F+feature%22)  
[Chat on Gitter](https://gitter.im/VisBug)  
[Chat on Spectrum](https://spectrum.chat/visbug)  
[Load VisBug from a CDN](https://codepen.io/argyleink/pen/rNrQrpO)  

### Web Component (coming soon 💀🤘)
```sh
npm i visbug
```




## Contribute

First off, thanks for taking the time to contribute!
Now, take a moment to be sure your contributions make sense to everyone else.
Questions or need help building a feature, come [chat on Gitter](https://gitter.im/VisBug) or [Spectrum](https://spectrum.chat/visbug)!

### Reporting Issues

Found a problem? Want a new feature? First of all see if your issue or idea has [already been reported](../../issues).
If it hasn't, just open a [new clear and descriptive issue](../../issues/new).

### Submitting pull requests

-   Fork it!
-   Clone your fork: `git clone https://github.com/<your-username>/ProjectVisBug`
-   Navigate to the newly cloned directory: `cd ProjectVisBug`
-   Create a new branch for the new feature: `git checkout -b my-new-feature`
-   Install the packages for development: `npm i`
-   Make your changes
-   Commit your changes: `git commit -am 'Added some feature'`
-   Push the branch: `git push origin my-new-feature`
-   Submit a pull request with full remarks documenting your changes through the GitHub UI

## License

[Apache2 License](LICENSE) © [Adam Argyle](https://argyleink.com)
