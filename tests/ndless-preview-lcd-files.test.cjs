const test=require('node:test'),assert=require('node:assert/strict');
const {build,preview}=require('./helpers/ndless-native.cjs');
const skip=process.platform!=='win32'||!process.env.TNS_DESKTOP_COMPILER;
function pixel(frame,x,y){const at=(y*320+x)*2;return frame[at]|frame[at+1]<<8;}
test('modern LCD callback ABI, all seven SDK formats, orientation and legacy CX palette', {skip,timeout:160000},async t=>{
 for(let type=0;type<7;type++)await t.test('lcd-format-'+type,{timeout:20000},async()=>{
  const fill=type===1?'memset(p,0xf0,sizeof(p));':type===4?'for(int i=0;i<76800;i++)((unsigned char*)p)[i]=1+(i&1);':type===2||type===6?`for(int x=0;x<320;x++)for(int y=0;y<240;y++)p[x*240+y]=((x&31)<<${type===2?11:10})|((y&${type===2?63:31})<<5)|7;`:`for(int i=0;i<76800;i++)p[i]=${type===5?'0x7c00':'0xf800'};`;
  const source=`#include <os.h>
static unsigned short p[320*240];
int main(){if(on_key_pressed())return 90;if(!lcd_init(${type}))return 1;${fill}
${type===4?'((volatile unsigned short*)0xc0000200)[1]=0x7c00;((volatile unsigned short*)0xc0000200)[2]=0x03e0;':''}
lcd_blit(p,${type});while(!isKeyPressed(KEY_NSPIRE_ESC)){}lcd_init(SCR_TYPE_INVALID);return 0;}`;
  const artifact=await build('lcd-format-'+type,{'main.c':source});
  const expected=type===1?0xffff:type===2||type===6?7:0xf800;
  const result=await preview({bytes:artifact.bytes,observe(m){return m.frame&&pixel(m.frame,0,0)===expected;}});
  const f=result.lastFrame;assert.equal(pixel(f,0,0),expected);
  if(type===1)assert.equal(pixel(f,1,0),0);
  if(type===4)assert.equal(pixel(f,1,0),0x07e0);
  if(type===2)assert.equal(pixel(f,123,77),(27<<11)|(13<<5)|7);
  if(type===6)assert.equal(pixel(f,123,77),(27<<11)|(26<<5)|7);
 });
 await t.test('indexed palette uses CX control at 0xC0000018',{timeout:20000},async()=>{
  const source=`#include <os.h>
static unsigned char p[76800];int main(){memset(p,1,sizeof(p));((volatile unsigned short*)0xc0000200)[1]=31;*(volatile unsigned*)0xc0000018=6;*(volatile unsigned*)0xc0000010=(unsigned)p;while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}`;
  const artifact=await build('cx-indexed',{'main.c':source});await preview({bytes:artifact.bytes,observe:m=>m.frame&&pixel(m.frame,100,100)===0xf800});
 });
});
test('game resources, relative directories, stat, legacy search, saves and ungetc',{skip,timeout:30000},async()=>{
 const source=`#include <os.h>
#include <stdio.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>
#include <errno.h>
static unsigned short p[76800];
int main(int argc,char**argv){
 if(on_key_pressed())return 91;enable_relative_paths(argv);if(chdir("levels"))return 93;
 FILE*f=fopen("stage.txt","rb");if(!f)return 2;char s[32]={0};if(fread(s,1,31,f)!=9||strcmp(s,"LEVEL_OK\\n"))return 3;fclose(f);
 struct nuc_stat st;if(nuc_stat("stage.txt",&st)||st.st_size!=9)return 4;
 DIR*d=opendir(".");if(!d)return 5;struct dirent*e;int found=0;while((e=readdir(d)))if(!strcmp(e->d_name,"stage.txt"))found=1;closedir(d);if(!found)return 6;
 DSTAT search;if(NU_Get_First(&search,"*.txt")||strcmp(search.filepath,"stage.txt"))return 7;NU_Done(&search);
 if(mkdir("save",0700)||chdir("save"))return 8;f=fopen("state.bin","wb");if(!f)return 9;fputc(65,f);fclose(f);
 f=fopen("state.bin","rb");if(!f||fgetc(f)!=65||ungetc(66,f)!=66||fgetc(f)!=66)return 10;fclose(f);
 if(fopen("missing.bin","rb")||errno!=2)return 11;
 for(int i=0;i<76800;i++)p[i]=0x07e0;lcd_init(SCR_320x240_565);lcd_blit(p,SCR_320x240_565);printf("files PASS argc=%d\\n",argc);fflush(stdout);
 while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}`;
 const artifact=await build('virtual-files',{'main.c':source});let requested=false;
 await preview({bytes:artifact.bytes,files:[['levels/stage.txt','LEVEL_OK\n']],observe(m,{requestFiles,stats}){
  if(m.stage==='exited')throw Error('Filesystem program exited before success: '+m.exitCode);
  if(!requested&&m.frame&&pixel(m.frame,20,20)===0x07e0&&stats.logs.join('').includes('files PASS')){requested=true;requestFiles();}
  if(m.type==='files'){const save=m.files.find(f=>f.path==='/documents/levels/save/state.bin');assert.ok(save);assert.deepEqual([...save.bytes],[65]);return true;}return false;
 }});
});
