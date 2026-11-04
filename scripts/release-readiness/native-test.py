"""Installed Android acceptance test. Sample data only. Every failed assertion fails CI."""
import json, os, re, subprocess, time, pathlib, xml.etree.ElementTree as ET
OUT=pathlib.Path('release-results');OUT.mkdir(exist_ok=True)
PKG=json.load(open('app.json'))['expo']['android']['package']
failures=[]

def adb(*args):
    return subprocess.check_output(['adb',*map(str,args)],text=True,stderr=subprocess.STDOUT)
def dump():
    adb('shell','uiautomator','dump','/sdcard/hats-ui.xml')
    text=adb('exec-out','cat','/sdcard/hats-ui.xml');(OUT/'last-ui.xml').write_text(text)
    return ET.fromstring(text)
def find(pattern):
    for node in dump().iter('node'):
        if re.search(pattern,node.get('text','')+'|'+node.get('content-desc',''),re.I):
            points=re.findall(r'\d+',node.get('bounds',''))
            if len(points)==4:
                x1,y1,x2,y2=map(int,points)
                size=re.findall(r'(\d+)x(\d+)',adb('shell','wm','size'))[-1]
                width,height=map(int,size)
                if x2>x1 and y2>y1 and 0 < (y1+y2)//2 < height and 0 < (x1+x2)//2 < width:return ((x1+x2)//2,(y1+y2)//2)
    return None
def wait_for(pattern,seconds=30,tap=False,scroll=False):
    end=time.time()+seconds
    attempts=0
    while time.time()<end:
        attempts+=1
        pos=find(pattern)
        if pos:
            if tap:adb('shell','input','tap',*pos)
            return
        if (tap or scroll) and attempts % 4 == 0:
            size=re.findall(r'(\d+)x(\d+)',adb('shell','wm','size'))[-1]
            width,height=map(int,size)
            adb('shell','input','swipe',width//2,height*3//5,width//2,height//3,400)
        time.sleep(1)
    raise AssertionError('UI did not show: '+pattern)
def shot(name):
    (OUT/(name+'.png')).write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
    dump();(OUT/(name+'.xml')).write_text((OUT/'last-ui.xml').read_text())
def open_app(uri=None):
    if uri:adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',uri,PKG)
    else:adb('shell','am','start','-W','-n',PKG+'/.MainActivity')
def note(message):
    print('PASS: '+message,flush=True)
    with (OUT/'native-results.txt').open('a') as f:f.write('PASS: '+message+'\n')
try:
    adb('install','-r','android/app/build/outputs/apk/release/app-release.apk')
    adb('shell','pm','grant',PKG,'android.permission.POST_NOTIFICATIONS')
    # Keep the fresh review build offline so a live OTA cannot replace the code under test.
    adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
    adb('logcat','-c');open_app()
    wait_for('Start with one real plan|Import my setup or backup',60)
    # The fixture uses the same validated import and encrypted storage as a real backup.
    fixture=os.environ['RUNNER_TEMP']+'/hats-native-ci.json';meta=os.environ['RUNNER_TEMP']+'/hats-native-meta.json'
    env=dict(os.environ,HATS_NATIVE_FIXTURE=fixture,HATS_NATIVE_META=meta,TZ='America/New_York')
    subprocess.run(['node','--import','tsx','scripts/release-readiness/native-fixture.ts'],check=True,env=env)
    details=json.load(open(meta))
    adb('push',fixture,'/sdcard/Download/hats-native-ci.json')
    adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file:///sdcard/Download/hats-native-ci.json')
    wait_for('Import my setup or backup',tap=True)
    time.sleep(2)
    if not find('hats-native-ci'):
        if find('Show roots|navigation drawer'):wait_for('Show roots|navigation drawer',tap=True)
        wait_for('Downloads',tap=True)
    wait_for(r'^hats-native-ci\.json\|',tap=True)
    wait_for('Native active event',40);shot('01-installed-plan')
    note('Native backup import and first day render')
    # Install a real host and bind the installed provider, not a made-up widget id.
    adb('install','-r',os.environ['RUNNER_TEMP']+'/hats-widget-host/host.apk')
    adb('shell','appwidget','grantbind','--package','com.hats.ci.widgethost','--user','0')
    adb('shell','am','start','-W','-n','com.hats.ci.widgethost/.WidgetHost','--es','target',PKG)
    wait_for('Disposable Hats widget check',45)
    assert any(n.get('package')=='com.hats.ci.widgethost' for n in dump().iter('node')),'Widget host is not the visible app'
    wait_for('Native active event',45);shot('02-real-widget')
    note('Real Android widget renders the same active event as Today')
    # Stay outside Hats while the OS posts the scheduled reminder.
    adb('shell','input','keyevent','KEYCODE_HOME')
    end=max(time.time()+10,details['due']/1000+35)
    posted=False
    while time.time()<end:
        notices=adb('shell','dumpsys','notification','--noredact')
        if re.search(r'NotificationRecord[^\n]*personal-plan-[^\n]*native-ci-task',notices):posted=True;break
        time.sleep(3)
    (OUT/'notifications.txt').write_text(adb('shell','dumpsys','notification','--noredact'))
    (OUT/'alarms.txt').write_text(adb('shell','dumpsys','alarm'))
    (OUT/'runtime.txt').write_text(adb('logcat','-d'))
    if posted:note('Scheduled reminder delivered while Hats is in the background')
    else:
        failures.append('OS did not post the timed reminder while Hats was in the background')
        print('FAIL: '+failures[-1],flush=True)
    # Save a one-day change with no network, then kill/reopen the installed app.
    adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
    open_app('hats://day-change?date='+details['date'])
    wait_for('Preview for this date',30);wait_for('Apply day change',tap=True)
    time.sleep(3);adb('shell','am','force-stop',PKG);open_app()
    wait_for('Only the essentials',40,scroll=True);shot('03-offline-reopen')
    note('Offline day change survives process termination and encrypted-store reopening')
    # Simulate a periodic provider refresh after the app process was killed in background.
    adb('shell','input','keyevent','KEYCODE_HOME');adb('shell','am','kill',PKG)
    logs=adb('logcat','-d','-s','HATS_WIDGET_CI:I','*:S')
    match=re.search(r'BOUND:(\d+):([^\s]+)',logs);assert match,'Widget host did not report a real binding'
    adb('shell','am','broadcast','-a','android.appwidget.action.APPWIDGET_UPDATE','-n',match.group(2),'--eia','appWidgetIds',match.group(1))
    adb('shell','am','start','-W','-n','com.hats.ci.widgethost/.WidgetHost','--es','target',PKG)
    wait_for('Disposable Hats widget check',30)
    wait_for('Native scheduled reminder',40);shot('04-background-widget')
    note('Bound widget remains readable after an app-process restart and provider refresh')
    # A revoked notification permission must not stop local planning or opening the app.
    adb('shell','pm','revoke',PKG,'android.permission.POST_NOTIFICATIONS');open_app()
    wait_for('My day changed',30);shot('05-permission-revoked')
    note('Planning remains available after notification permission is revoked')
    crash=adb('logcat','-d','-b','crash');(OUT/'crash.txt').write_text(crash)
    assert 'FATAL EXCEPTION' not in crash,'Android crash buffer contains a fatal exception'
    note('No fatal Android crashes')
    assert not failures,'; '.join(failures)
except Exception:
    try:shot('failure');(OUT/'crash.txt').write_text(adb('logcat','-d','-b','crash'))
    except Exception:pass
    raise
