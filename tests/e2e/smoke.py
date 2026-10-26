"""Medora end-to-end checks (Playwright). See docs/TESTING.md. Run the app with the mock LLM first."""
import re
from playwright.sync_api import sync_playwright
import os, time
B=os.environ.get("MEDORA_URL","http://localhost:4014")
EMAIL=f"achu.{int(time.time())}@example.com"
NEWNAME=f"Achu R{int(time.time())%1000}"
res=[]
def check(n,ok,extra=""):
    res.append(ok); print(("PASS " if ok else "FAIL ")+n+(f"  [{extra}]" if extra else ""))
with sync_playwright() as p:
    br=p.chromium.launch()
    ctx=br.new_context(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True)
    page=ctx.new_page(); errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.on("console",lambda m:errors.append(m.text) if m.type=="error" else None)
    def overflow(l):
        w=page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
        check(f"no horizontal scroll: {l}", w[0]<=w[1]+1, str(w))
    def theme(t):
        page.evaluate(f"localStorage.setItem('medora-theme','{t}')"); page.reload(); page.wait_for_timeout(500)
    sizes={"phone":(390,844),"tablet":(820,1100),"desktop":(1366,860)}
    # landing: light + dark at three sizes
    for t in ("light","dark"):
        page.goto(B+"/"); theme(t)
        for n,(w,h) in sizes.items():
            page.set_viewport_size({"width":w,"height":h}); page.wait_for_timeout(300)
            page.wait_for_selector("h1")
            check(f"landing {t}/{n}","health companion" in page.inner_text("h1").lower())
            overflow(f"landing {t}/{n}")
            page.screenshot(path=f"/tmp/medora-shots/new-landing-{t}-{n}.png", full_page=(n!="desktop"))
        check(f"theme attr {t}", page.evaluate("document.documentElement.dataset.theme")==t)
    page.set_viewport_size({"width":390,"height":844}); theme("light")
    # auth pages
    for path in ("/login","/register","/legal/privacy","/nope"):
        page.goto(B+path); page.wait_for_selector("h1"); overflow(path)
    page.goto(B+"/login"); page.screenshot(path="/tmp/medora-shots/new-login-phone.png")
    page.set_viewport_size({"width":1366,"height":860}); page.screenshot(path="/tmp/medora-shots/new-login-desktop.png")
    page.set_viewport_size({"width":390,"height":844})
    # account + login
    r=page.request.post(B+"/api/auth/register",data={"fullName":"Achu Ransom","email":EMAIL,"password":"Passw0rd!xyz","termsAccepted":True,"healthDataConsent":True,"cookieNoticeAccepted":True})
    check("register",r.status==201)
    page.goto(B+"/login"); page.fill("#login-email",EMAIL); page.fill("#login-password","Passw0rd!xyz"); page.click("button[type=submit]")
    page.wait_for_url(re.compile(B+"/?$"),timeout=10000); page.wait_for_timeout(800)
    check("greeting uses first name", "Achu" in page.inner_text("h1"))
    overflow("chat empty phone"); page.screenshot(path="/tmp/medora-shots/new-chat-empty-phone.png")
    page.set_viewport_size({"width":1366,"height":860}); page.wait_for_timeout(300)
    page.screenshot(path="/tmp/medora-shots/new-chat-empty-desktop.png")
    # conversation
    box=page.get_by_label("Describe your health concern")
    box.fill("hi"); box.press("Enter")
    page.get_by_text("Lovely to hear from you").wait_for(timeout=15000)
    check("small talk gets a reply (LLM path)",True)
    check("no severity badge on small talk", page.get_by_text("Self-care").count()==0 and page.get_by_text("Monitor").count()==0)
    check("suggestion chips appear", page.get_by_role("button",name="Health tips").count()==1)
    page.get_by_role("button",name="Health tips").click()
    page.wait_for_timeout(1500)
    box=page.get_by_label("Describe your health concern"); box.fill("I have a headache"); box.press("Enter")
    page.get_by_text("Drink water").wait_for(timeout=15000)
    check("markdown list rendered", page.locator(".chat-prose ul li").count()>=2)
    check("severity badge has icon+text", page.get_by_text("Monitor").count()>=1)
    box=page.get_by_label("Describe your health concern"); box.fill("I have chest pain and cannot breathe"); box.press("Enter")
    page.get_by_role("link",name=re.compile("Call 119")).wait_for(timeout=15000)
    check("urgent card shows call 119", True)
    page.wait_for_timeout(600)
    page.screenshot(path="/tmp/medora-shots/new-chat-urgent-desktop.png")
    page.get_by_role("button",name="Emergency").first.click()
    page.get_by_role("dialog").wait_for()
    check("emergency dialog lists numbers", page.get_by_text("117").count()>=1 and page.get_by_text("118").count()>=1)
    page.screenshot(path="/tmp/medora-shots/new-emergency-desktop.png")
    page.keyboard.press("Escape")
    check("escape closes dialog", page.get_by_role("dialog").count()==0)
    page.set_viewport_size({"width":390,"height":844}); page.wait_for_timeout(300)
    overflow("chat conversation phone"); page.screenshot(path="/tmp/medora-shots/new-chat-convo-phone.png")
    # dark chat
    theme("dark"); page.wait_for_timeout(600)
    page.screenshot(path="/tmp/medora-shots/new-chat-convo-dark-phone.png")
    page.set_viewport_size({"width":1366,"height":860}); page.wait_for_timeout(300)
    page.screenshot(path="/tmp/medora-shots/new-chat-convo-dark-desktop.png")
    # sidebar title + grouping
    check("conversation titled by LLM", page.get_by_text("Headache and fever").count()>=1)
    check("sidebar grouped by date", page.get_by_text("Today",exact=True).count()>=1)
    # profile light/dark
    page.goto(B+"/profile"); page.wait_for_selector("#profile-form")
    page.screenshot(path="/tmp/medora-shots/new-profile-dark-desktop.png")
    theme("light"); page.wait_for_selector("#profile-form")
    page.get_by_label("Full name").fill(NEWNAME)
    page.get_by_role("button",name="Save changes").click(); page.get_by_text("Profile saved.").wait_for(timeout=5000)
    check("profile still saves",True)
    page.set_viewport_size({"width":390,"height":844}); page.wait_for_timeout(300)
    overflow("profile phone"); page.screenshot(path="/tmp/medora-shots/new-profile-phone.png")
    # theme toggle control works
    page.locator('#main').get_by_role("button",name="Dark theme").click(); page.wait_for_timeout(300)
    check("toggle switches to dark", page.evaluate("document.documentElement.dataset.theme")=="dark")
    bad=[e for e in errors if "401" not in e and "404" not in e]
    check("no unexpected console errors", not bad, "; ".join(bad)[:300])
    br.close()
print(f"\n{sum(res)}/{len(res)} passed")
