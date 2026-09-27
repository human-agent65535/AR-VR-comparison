// Interface state stays separate from optics and scene state.
export function createControlsLayout(mode){
  const root=document.getElementById('experience');
  const panel=document.getElementById('experience-settings');
  const toggle=document.getElementById('settings-toggle');
  const tabs=[...panel.querySelectorAll('[data-settings-tab]')];
  let open=false;
  function setOpen(value,focus=false){
    open=value;panel.hidden=!open;root.dataset.settingsOpen=String(open);
    toggle.setAttribute('aria-expanded',String(open));
    if(focus){
      (open?tabs.find(tab=>tab.getAttribute('aria-selected')==='true'):toggle).focus({preventScroll:true});
      if(open&&matchMedia('(max-width:1099px)').matches)panel.scrollIntoView({block:'nearest'});
    }
  }
  function selectTab(selected){
    for(const tab of tabs){
      const active=tab===selected;
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
    }
    panel.querySelector('.settings-body').scrollTop=0;
  }
  toggle.addEventListener('click',()=>setOpen(!open,true));
  document.getElementById('settings-close').addEventListener('click',()=>setOpen(false,true));
  for(const tab of tabs){
    tab.addEventListener('click',()=>selectTab(tab));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const i=event.key==='Home'?0:event.key==='End'?tabs.length-1:(tabs.indexOf(tab)+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      selectTab(tabs[i]);tabs[i].focus();
    });
  }
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false,true);}});
  setOpen(mode!=='split'&&matchMedia('(min-width:1100px) and (min-height:541px)').matches);
}
