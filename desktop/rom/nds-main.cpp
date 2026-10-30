/* GPL-3.0-or-later: Ndless single-thread frontend for NooDS. */
#ifdef TNS_ROM_PREVIEW
#include "preview-os.h"
#else
#include <libndls.h>
#endif
#include "core.h"
#include "embedded_rom.h"
#include <cstring>
static Core *machine;
static uint32_t screen[256*384];
static unsigned short pixels[320*240];
extern "C" FILE *tns_nds_open(const char *name,const char *mode){
 if(!strcmp(name,"embedded.nds")&&mode[0]=='r'){
#ifdef TNS_EXTERNAL_ROM
  return fopen(TNS_ROM_FILENAME,"rb");
#else
  return fmemopen((void*)tns_rom_data,TNS_ROM_SIZE,"rb");
#endif
 }
 return fopen(name,mode);
}
static int initialize(){
 Settings::directBoot=1;Settings::romInRam=0;Settings::fpsLimiter=0;Settings::frameskip=0;
 Settings::threaded2D=0;Settings::threaded3D=0;Settings::highRes3D=0;Settings::emulateAudio=0;Settings::dsiMode=0;
 Settings::savesFolder=Settings::statesFolder=Settings::cheatsFolder=0;
 try{machine=new Core("embedded.nds");}catch(CoreError e){printf("NDS boot failed: %d\n",(int)e);return (int)e;}catch(...){puts("NDS initialization failed");return 9;}
 if(!lcd_init(SCR_320x240_565))return 10;puts("NDS cartridge running");return 0;
}
static void frame(unsigned keys){
 static const unsigned indices[]={6,7,5,4,0,1,10,11,2,8,3,9};
 for(unsigned i=0;i<12;i++)if(keys&(1u<<i))machine->input.pressKey(indices[i]);else machine->input.releaseKey(indices[i]);
 bool painted=false;for(int tries=0;tries<2048;tries++){machine->runCore();if(machine->gpu.getFrame(screen,false)){painted=true;break;}}
 if(!painted){puts("DS frame did not complete");std::abort();}
 for(unsigned y=0;y<240;y++)for(unsigned x=0;x<160;x++){
  unsigned c=screen[(y*384/240)*256+x*256/160];pixels[y*320+80+x]=((c&0xf8)<<8)|((c>>5)&0x7e0)|((c>>19)&31);
 }
 lcd_blit(pixels,SCR_320x240_565);
}
#ifdef TNS_ROM_PREVIEW
unsigned tns_preview_keys,TNS_ROM_SIZE;
const unsigned char *tns_rom_data;
extern "C" {
int tns_load(const unsigned char *data,unsigned size){tns_rom_data=data;TNS_ROM_SIZE=size;return initialize();}
void tns_step(unsigned keys){tns_preview_keys=keys;frame(keys);}
unsigned short *tns_pixels(){return pixels;}
unsigned char *tns_save(){return machine->cartridgeNds.tnsSaveData();}
unsigned tns_save_size(){int n=machine->cartridgeNds.getSaveSize();return n>0?(unsigned)n:0;}
void tns_restore_save(const unsigned char *data,unsigned size){if(size&&size<=1024*1024){machine->cartridgeNds.resizeSave(size,false);memcpy(machine->cartridgeNds.tnsSaveData(),data,size);}}
void tns_touch(unsigned x,unsigned y,unsigned down){if(down&&x>=80&&x<240&&y>=120&&y<240){machine->input.pressScreen();machine->spi.setTouch((x-80)*256/160,(y-120)*192/120);}else{machine->input.releaseScreen();machine->spi.clearTouch();}}
}
#else
static int stylus_x=128,stylus_y=96;static bool stylus_mode;
static unsigned keys(){unsigned k=0;
 if(isKeyPressed(KEY_NSPIRE_UP))k|=1u<<0;if(isKeyPressed(KEY_NSPIRE_DOWN))k|=1u<<1;
 if(isKeyPressed(KEY_NSPIRE_LEFT))k|=1u<<2;if(isKeyPressed(KEY_NSPIRE_RIGHT))k|=1u<<3;
 if(isKeyPressed(KEY_NSPIRE_CTRL))k|=1u<<4;if(isKeyPressed(KEY_NSPIRE_SHIFT))k|=1u<<5;
 if(isKeyPressed(KEY_NSPIRE_VAR))k|=1u<<6;if(isKeyPressed(KEY_NSPIRE_DEL))k|=1u<<7;
 if(isKeyPressed(KEY_NSPIRE_TAB))k|=1u<<8;if(isKeyPressed(KEY_NSPIRE_MENU))k|=1u<<9;
 if(isKeyPressed(KEY_NSPIRE_MINUS))k|=1u<<11;
 if(isKeyPressed(KEY_NSPIRE_ENTER))k|=1u<<10;
 stylus_mode=isKeyPressed(KEY_NSPIRE_DOC);if(stylus_mode){if(k&1)stylus_y-=3;if(k&2)stylus_y+=3;if(k&4)stylus_x-=3;if(k&8)stylus_x+=3;stylus_x=stylus_x<0?0:stylus_x>255?255:stylus_x;stylus_y=stylus_y<0?0:stylus_y>191?191:stylus_y;if(k&16){machine->input.pressScreen();machine->spi.setTouch(stylus_x,stylus_y);}else{machine->input.releaseScreen();machine->spi.clearTouch();}k&=~31u;}else{machine->input.releaseScreen();machine->spi.clearTouch();}return k;}
int main(){int r=initialize();if(r)return r;while(!isKeyPressed(KEY_NSPIRE_ESC)){frame(keys());if(stylus_mode){int x=80+stylus_x*160/256,y=120+stylus_y*120/192;for(int d=-3;d<=3;d++){if(x+d>=80&&x+d<240)pixels[y*320+x+d]=0xffff;if(y+d>=120&&y+d<240)pixels[(y+d)*320+x]=0xffff;}lcd_blit(pixels,SCR_320x240_565);}}machine->cartridgeNds.writeSave();delete machine;puts("NDS saved and exited");return 0;}
#endif
