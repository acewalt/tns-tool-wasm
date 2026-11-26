// This string is standalone Lua 5.1; it does not depend on the builder or HTML.
export const runtimeLua = String.raw`
VB={pages={},handlers={},plots={},formulas={},vars={},initial={},assets={},order={},history={},queue={},trace={},focus=nil,error=nil,clock=0,wait=0,paused=false}
VB.mathEditors={}
function VB.setupFormulas()
 for id,p in pairs(VB.pages) do for _,c in ipairs(p.components) do if c.type=="Formula" then
  local e=D2Editor.newRichText() e:resize(math.max(4,c.w),math.max(4,c.h)) e:move(c.x,c.y) e:setReadOnly(true) e:setSelectable(false) e:setVisible(false) e:setExpression(c.expression or "0") VB.mathEditors[id..":"..c.id]=e
 end end end
end
function VB.number(v) local n=tonumber(v) if n==nil then error("Expected a number: "..tostring(v)) end return n end
function VB.round(v,n) local p=10^(n or 0) return math.floor(VB.number(v)*p+0.5)/p end
function VB.length(v) return #v end
function VB.item(v,i) return v[VB.number(i)] end
function VB.concat(a,b) return tostring(a)..tostring(b) end
function VB.cas(s) if type(s)~="string" then error("CAS needs a string") end local value,code=math.eval(s) if value==nil and math.evalStr then value,code=math.evalStr(s) end if value==nil then error("CAS: "..tostring(code or s)) end return value end
function VB.format(v,d,p,s) if type(v)=="number" and d>=0 then v=string.format("%."..math.min(12,math.floor(d)).."f",v) end return (p or "")..tostring(v)..(s or "") end
function VB.get(id) local p=VB.pages[VB.current] for _,c in ipairs(p.components) do if c.id==id then return c end end error("Missing component: "..tostring(id)) end
function VB.value(id) return VB.get(id).value end
function VB.input(id) return VB.number(VB.value(id)) end
function VB.text(id) return VB.get(id).text end
function VB.variable(id) local p=VB.pages[VB.current] if p and p.variables and p.variables[id]~=nil then return p.variables[id] end return VB.vars[id] end
function VB.setVariable(id,v,scope) if scope=="local" then local p=VB.pages[VB.current] p.variables=p.variables or {} p.variables[id]=v else VB.vars[id]=v end end
function VB.resetVariable(id,scope) local p=VB.pages[VB.current] local initial=scope=="local" and p.initialVariables or VB.initial VB.setVariable(id,initial[id],scope) end
function VB.setText(id,v) VB.get(id).text=tostring(v) end
function VB.setValue(id,v) local c=VB.get(id) if c.value==v then return end c.value=v VB.emit(VB.current..":"..id..":change") end
function VB.setVisible(id,v) VB.get(id).visible=v end
function VB.prepend(list) if #VB.queue+#list>5000 then error("Action queue limit: 5000") end for i=#list,1,-1 do table.insert(VB.queue,1,list[i]) end end
function VB.repeatActions(n,list) n=math.max(0,math.min(1000,math.floor(n))) for i=1,n do VB.prepend(list) end end
function VB.whileActions(condition,list)
 local count=0 local check
 check={id="while",run=function() count=count+1 if count>1000 then error("While limit: 1000 iterations") end if condition() then table.insert(VB.queue,1,check) VB.prepend(list) end end}
 table.insert(VB.queue,1,check)
end
function VB.tickQueue(single)
 if VB.running then return end VB.running=true local n=0
 while #VB.queue>0 and not VB.paused and VB.wait<=0 and n<100 do
  local action=table.remove(VB.queue,1)
  if action.stop and not VB.skipBreak then table.insert(VB.queue,1,action) VB.paused=true break end
  VB.skipBreak=false table.insert(VB.trace,action.id) if #VB.trace>100 then table.remove(VB.trace,1) end
  local ok,result=pcall(action.run)
  if not ok then VB.error=action.id..": "..tostring(result) VB.queue={} break end
  if result==false then VB.queue={} break end
  if type(result)=="number" then VB.wait=result end
  n=n+1 if single then VB.paused=true break end
 end
 VB.running=false platform.window:invalidate()
end
function VB.resume() VB.paused=false VB.skipBreak=true VB.tickQueue() end
function VB.step() VB.paused=false VB.skipBreak=true VB.tickQueue(true) end
function VB.emit(key) local list=VB.handlers[key] if list then if #VB.queue+#list>5000 then VB.error="Action queue limit" VB.queue={} return end for _,a in ipairs(list) do table.insert(VB.queue,a) end if not VB.running then VB.tickQueue() end end end
function VB.validate(ids) for _,id in ipairs(ids) do if tonumber(VB.value(id))==nil then VB.error="Enter a valid number: "..id VB.focus=id return false end end VB.error=nil return true end
function VB.go(id) if not VB.pages[id] then error("Missing page: "..id) end table.insert(VB.history,VB.current) VB.current=id VB.focus=nil VB.error=nil VB.emit(id..":show") platform.window:invalidate() end
function VB.back() local id=table.remove(VB.history) if id then VB.current=id VB.focus=nil VB.emit(id..":show") end platform.window:invalidate() end
function VB.nextPage() for i,id in ipairs(VB.order) do if id==VB.current then VB.go(VB.order[(i % #VB.order)+1]) return end end end
function VB.rgb(gc,c) local s=c or "#000000" gc:setColorRGB(tonumber(string.sub(s,2,3),16) or 0,tonumber(string.sub(s,4,5),16) or 0,tonumber(string.sub(s,6,7),16) or 0) end
function VB.rect(c,seen)
 local x,y=c.x,c.y seen=seen or {} if seen[c.id] then return x,y,c.w,c.h end seen[c.id]=true
 if c.parent and c.parent~="" then local p=VB.get(c.parent) local px,py=VB.rect(p,seen) x=x+px y=y+py-(p.offset or 0) end return x,y,c.w,c.h
end
function VB.visible(c)
 if c.visible==false then return false end if c.parent and c.parent~="" then return VB.visible(VB.get(c.parent)) end return true
end
function VB.clip(gc,c,sx,sy)
 if c.parent and c.parent~="" then local p=VB.get(c.parent) VB.clip(gc,p,sx,sy) local x,y,w,h=VB.rect(p) gc:clipRect("intersect",x*sx,y*sy,w*sx,h*sy) end
end
function VB.draw(gc,c,sx,sy)
 if not VB.visible(c) then return end
 local x,y,w,h=VB.rect(c) x=x*sx y=y*sy w=w*sx h=h*sy
 gc:clipRect("reset",0,0,0,0) VB.clip(gc,c,sx,sy) gc:clipRect("intersect",x,y,w,h)
 local size=math.max(6,math.min(36,c.font*math.min(sx,sy))) gc:setFont("sansserif",c.bold and "b" or "r",size)
 VB.rgb(gc,c.color) gc:fillRect(x,y,w,h) VB.rgb(gc,c.border)
 if c.type~="Label" and c.type~="Formula" then gc:drawRect(x,y,w-1,h-1) end
 VB.rgb(gc,c.foreground)
 local text=c.text or "" local kind=c.type
 if kind=="Input" then text=tostring(c.value or "")..(VB.focus==c.id and "|" or "")
 elseif kind=="Checkbox" or kind=="Radio" then
  local checked=c.value==true or c.value=="true" gc:drawRect(x+3*sx,y+5*sy,12*sx,12*sy) if checked then gc:fillRect(x+6*sx,y+8*sy,6*sx,6*sy) end text="    "..text
 elseif kind=="Dropdown" then text=tostring(c.value~="" and c.value or string.match(c.options or "","[^\n]+") or "").." v"
 elseif kind=="Slider" or kind=="Progress" then
  local f=math.max(0,math.min(1,((tonumber(c.value) or 0)-c.min)/(c.max-c.min)))
  VB.rgb(gc,c.foreground) if kind=="Progress" then gc:fillRect(x+2,y+2,(w-4)*f,h-4) else gc:drawLine(x+5,y+h/2,x+w-5,y+h/2) gc:fillRect(x+f*(w-8),y+3,8,h-6) end text=""
 elseif kind=="Shape" then
  if c.shape=="circle" then VB.rgb(gc,c.foreground) gc:fillArc(x+2,y+2,w-4,h-4,0,360)
  elseif c.shape=="line" then gc:drawLine(x,y,x+w,y+h)
  else VB.rgb(gc,c.foreground) gc:fillRect(x+2,y+2,w-4,h-4) end text=""
 elseif kind=="Graph" then
  VB.rgb(gc,c.border) gc:drawLine(x,y+h/2,x+w,y+h/2) gc:drawLine(x+w/2,y,x+w/2,y+h)
  VB.rgb(gc,c.foreground) local fn=VB.plots[VB.current..":"..c.id] local last=nil
  for i=0,math.floor(w) do local xx=(i/w)*20-10 local ok,v=pcall(fn,xx) if ok and type(v)=="number" and v==v and math.abs(v)<10000 then local yy=y+h/2-v*h/20 if last and math.abs(yy-last)<h then gc:drawLine(x+i-1,last,x+i,yy) end last=yy else last=nil end end text=""
 elseif kind=="Table" then
  local row=0 for line in string.gmatch(c.rows or "","[^\n]+") do local col=0 for value in string.gmatch(line..",","(.-),") do gc:drawString(value,x+4+col*w/3,y+row*18*sy,"top") col=col+1 end row=row+1 end text=""
 elseif kind=="Formula" then
  local fn=VB.formulas[VB.current..":"..c.id] local ok,v=pcall(fn) text=(c.text~="Formula" and c.text~="" and c.text.." = " or "")..(ok and tostring(v) or tostring(c.expression))
 elseif kind=="Image" then
  local a=VB.assets[c.asset] if a then local i=0 for _,run in ipairs(a.runs) do if run[5]~=0 then gc:setColorRGB(run[2],run[3],run[4]) end for k=1,run[1] do if run[5]~=0 then local px=i%a.width local py=math.floor(i/a.width) gc:fillRect(x+px*w/a.width,y+py*h/a.height,math.ceil(w/a.width),math.ceil(h/a.height)) end i=i+1 end end else gc:drawString("Image",x+3,y+3,"top") end text=""
 elseif kind=="Panel" or kind=="Scroll" then text="" end
 if text~="" then
  local ty=y+3*sy local tx=x+4*sx if kind=="Button" then tx=x+math.max(2,(w-gc:getStringWidth(text))/2) ty=y+math.max(1,(h-gc:getStringHeight(text))/2) end
  for line in string.gmatch(text.."\n","(.-)\n") do gc:drawString(line,tx,ty,"top") ty=ty+gc:getStringHeight(line) end
 end
 if VB.focus==c.id then VB.rgb(gc,"#2899bc") gc:drawRect(x+1,y+1,w-3,h-3) end
 gc:clipRect("reset",0,0,0,0)
end
function on.paint(gc)
 local p=VB.pages[VB.current] if not p then return end local sx=platform.window:width()/320 local sy=platform.window:height()/212
 for key,e in pairs(VB.mathEditors) do e:setVisible(false) end
 VB.rgb(gc,p.background) gc:fillRect(0,0,platform.window:width(),platform.window:height())
 for _,c in ipairs(p.components) do VB.draw(gc,c,sx,sy) end
 for _,c in ipairs(p.components) do if c.type=="Formula" and VB.visible(c) then local e=VB.mathEditors[VB.current..":"..c.id] local x,y,w,h=VB.rect(c) if e then e:move(x*sx,y*sy) e:resize(math.max(4,w*sx),math.max(4,h*sy)) e:setFontSize(math.max(6,math.min(36,c.font*math.min(sx,sy)))) e:setVisible(true) end end end
 if VB.error or VB.paused then gc:setColorRGB(110,25,30) gc:fillRect(0,platform.window:height()-22,platform.window:width(),22) gc:setColorRGB(255,255,255) gc:setFont("sansserif","r",9) gc:drawString(VB.error or "Breakpoint: Enter = step, R = resume",4,platform.window:height()-19,"top") end
end
function VB.hit(x,y)
 local p=VB.pages[VB.current] for i=#p.components,1,-1 do local c=p.components[i] if VB.visible(c) then local a,b,w,h=VB.rect(c) local inside=x>=a and x<=a+w and y>=b and y<=b+h local parent=c.parent
 while inside and parent and parent~="" do local pc=VB.get(parent) local px,py,pw,ph=VB.rect(pc) inside=x>=px and x<=px+pw and y>=py and y<=py+ph parent=pc.parent end
 if inside then return c end end end
end
function VB.activate(c,x)
 if not c then VB.focus=nil return end VB.focus=c.id VB.error=nil
 if c.type=="Checkbox" then c.value=not(c.value==true or c.value=="true") VB.emit(VB.current..":"..c.id..":change")
 elseif c.type=="Radio" then for _,other in ipairs(VB.pages[VB.current].components) do if other.type=="Radio" and other.group==c.group then other.value=false end end c.value=true VB.emit(VB.current..":"..c.id..":change")
 elseif c.type=="Dropdown" then local list={} for s in string.gmatch(c.options or "","[^\n]+") do table.insert(list,s) end local index=c.value=="" and 1 or 0 for i,s in ipairs(list) do if s==c.value then index=i end end if #list>0 then c.value=list[(index % #list)+1] end VB.emit(VB.current..":"..c.id..":change")
 elseif c.type=="Slider" then if x then local a=VB.rect(c) c.value=VB.round(c.min+math.max(0,math.min(1,(x-a)/c.w))*(c.max-c.min),2) else c.value=math.min(c.max,(tonumber(c.value) or c.min)+(c.step or 1)) end VB.emit(VB.current..":"..c.id..":change") end
 VB.emit(VB.current..":"..c.id..":click") platform.window:invalidate()
end
function on.mouseDown(x,y) x=x*320/platform.window:width() y=y*212/platform.window:height() local c=VB.hit(x,y) VB.activate(c,x) VB.drag=c and c.id end
function on.mouseMove(x,y) if VB.drag then local c=VB.get(VB.drag) if c.type=="Slider" then VB.activate(c,x*320/platform.window:width()) end end end
function on.mouseUp(x,y) VB.drag=nil end
function VB.tab()
 local list={} for _,c in ipairs(VB.pages[VB.current].components) do if VB.visible(c) and (c.type=="Input" or c.type=="Button" or c.type=="Checkbox" or c.type=="Radio" or c.type=="Slider" or c.type=="Dropdown") then table.insert(list,c) end end
 local i=0 for j,c in ipairs(list) do if c.id==VB.focus then i=j end end if #list>0 then VB.focus=list[(i % #list)+1].id end platform.window:invalidate()
end
function on.tabKey() VB.tab() end
function on.charIn(s)
 if VB.paused and (s=="r" or s=="R") then VB.resume() return end
 if s=="\t" then VB.tab() return end
 if VB.focus then local c=VB.get(VB.focus) if c.type=="Input" then c.value=tostring(c.value or "")..s VB.error=nil VB.emit(VB.current..":"..c.id..":change") end end platform.window:invalidate()
end
function on.backspaceKey() if VB.focus then local c=VB.get(VB.focus) if c.type=="Input" then local s=tostring(c.value or "") local n=#s while n>0 and string.byte(s,n)>=128 and string.byte(s,n)<192 do n=n-1 end c.value=string.sub(s,1,math.max(0,n-1)) VB.emit(VB.current..":"..c.id..":change") end end platform.window:invalidate() end
function on.enterKey() if VB.paused then VB.step() return end if VB.focus then local c=VB.get(VB.focus) if c.type~="Input" then VB.activate(c) end VB.emit(VB.current..":"..c.id..":enter") else VB.tab() end end
function on.escapeKey() VB.error=nil VB.back() end
function on.arrowKey(key)
 if VB.focus then local c=VB.get(VB.focus) if c.type=="Scroll" then c.offset=math.max(0,math.min(math.max(0,(c.scrollHeight or c.h)-c.h),(c.offset or 0)+(key=="up" and -16 or 16)))
 elseif c.type=="Slider" then c.value=math.max(c.min,math.min(c.max,(tonumber(c.value) or c.min)+((key=="left" or key=="down") and -1 or 1)*(c.step or 1))) VB.emit(VB.current..":"..c.id..":change")
 else VB.tab() end else VB.tab() end platform.window:invalidate()
end
function on.arrowUp() on.arrowKey("up") end
function on.arrowDown() on.arrowKey("down") end
function on.arrowLeft() on.arrowKey("left") end
function on.arrowRight() on.arrowKey("right") end
function on.resize() platform.window:invalidate() end
function on.timer() VB.clock=VB.clock+0.05 VB.wait=math.max(0,VB.wait-0.05) VB.tickQueue() if VB.clock>=0.5 then VB.clock=0 VB.emit("app:timer") end end
timer.start(0.05)
`;
