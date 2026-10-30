/* Ndless LCD/input adapter for PocketSNES. The cartridge stays local. */
#ifdef TNS_ROM_PREVIEW
#include "preview-os.h"
#else
#include <libndls.h>
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#undef TRUE
#undef FALSE
#include "snes9x.h"
#include "memmap.h"
#include "cpuexec.h"
#include "ppu.h"
#include "gfx.h"
#include "display.h"
#include "embedded_rom.h"

/* Keep all renderer buffers together: this core stores pointer deltas in ints. */
static struct {
    uint8 screen[640 * 544], sub[640 * 544];
    uint8 depth[320 * 544], subdepth[320 * 544];
} video;
static unsigned short output[320 * 240];
static bool quit_requested;
static unsigned frames;

void _makepath(char *p,const char*,const char *d,const char *n,const char *e) {
    snprintf(p,1024,"%s%s%s%s%s",d?d:"",d&&*d?"/":"",n?n:"",e&&*e?".":"",e?e:"");
}
void _splitpath(const char *p,char *drive,char *dir,char *name,char *ext) {
    *drive=*dir=*ext=0; const char *slash=strrchr(p,'/');
    if(slash){memcpy(dir,p,slash-p);dir[slash-p]=0;p=slash+1;}
    const char *dot=strrchr(p,'.'); if(dot){memcpy(name,p,dot-p);name[dot-p]=0;strcpy(ext,dot+1);}else strcpy(name,p);
}
bool JustifierOffscreen(){return true;}
void JustifierButtons(uint32&){}
void S9xProcessSound(unsigned int){}
extern "C" {
void S9xExit(){quit_requested=true;}
void S9xGenerateSound(){}
void S9xSetPalette(){}
void S9xExtraUsage(){}
void S9xParseArg(char**,int&,int){}
void S9xLoadSDD1Data(){}
uint32 S9xPerfTicks(){return 0;}
void S9xPerfRenderDone(uint32){}
void S9xBeforeDrawingLines(uint32){}
bool8 S9xInitUpdate(){return TRUE;}
bool8 S9xDeinitUpdate(int width,int height,bool8) {
    if(width<1||width>512||height<1||height>512)return FALSE;
    unsigned h=height>240?240:height,w=width>320?320:width;
    for(unsigned y=0;y<h;y++)for(unsigned x=0;x<w;x++)
        output[(y+(240-h)/2)*320+x+(320-w)/2]=((uint16*)(GFX.Screen+(y*height/h)*GFX.Pitch))[x*width/w];
    lcd_blit(output,SCR_320x240_565); frames++;
    return TRUE;
}
uint32 S9xReadJoypad(int which) {
    if(which)return 0;
    uint32 joy=0x80000000;
    if(isKeyPressed(KEY_NSPIRE_UP))joy|=SNES_UP_MASK;
    if(isKeyPressed(KEY_NSPIRE_DOWN))joy|=SNES_DOWN_MASK;
    if(isKeyPressed(KEY_NSPIRE_LEFT))joy|=SNES_LEFT_MASK;
    if(isKeyPressed(KEY_NSPIRE_RIGHT))joy|=SNES_RIGHT_MASK;
    if(isKeyPressed(KEY_NSPIRE_CTRL))joy|=SNES_A_MASK;
    if(isKeyPressed(KEY_NSPIRE_SHIFT))joy|=SNES_B_MASK;
    if(isKeyPressed(KEY_NSPIRE_VAR))joy|=SNES_X_MASK;
    if(isKeyPressed(KEY_NSPIRE_DEL))joy|=SNES_Y_MASK;
    if(isKeyPressed(KEY_NSPIRE_TAB))joy|=SNES_TL_MASK;
    if(isKeyPressed(KEY_NSPIRE_MENU))joy|=SNES_TR_MASK;
    if(isKeyPressed(KEY_NSPIRE_ENTER))joy|=SNES_START_MASK;
    if(isKeyPressed(KEY_NSPIRE_MINUS))joy|=SNES_SELECT_MASK;
    return joy;
}
bool8 S9xReadMousePosition(int,int&,int&,uint32&){return FALSE;}
bool8 S9xReadSuperScopePosition(int&,int&,uint32&){return FALSE;}
const char *S9xGetFilename(const char*){return TNS_SAVE_FILENAME;}
const char *S9xGetFilenameInc(const char *ext){return ext;}
const char *S9xBasename(const char *p){const char *s=strrchr(p,'/');return s?s+1:p;}
void S9xAutoSaveSRAM(){Memory.SaveSRAM(TNS_SAVE_FILENAME);}
void S9xSyncSpeed(){IPPU.RenderThisFrame=TRUE;}
void S9xMessage(int,int,const char *message){if(message){puts(message);fflush(stdout);}}
}
static int initialize() {
    memset(&Settings,0,sizeof(Settings));
    Settings.CyclesPercentage=100;Settings.H_Max=SNES_CYCLES_PER_SCANLINE;
    Settings.Shutdown=Settings.ShutdownMaster=TRUE;
    Settings.FrameTimePAL=20000;Settings.FrameTimeNTSC=16667;Settings.FrameTime=16667;
    Settings.DisableMasterVolume=Settings.DisableSoundEcho=TRUE;
    Settings.StarfoxHack=TRUE;Settings.Transparency=TRUE;
    Settings.SuperFX=Settings.DSP1Master=Settings.SA1=Settings.C4=Settings.SDD1=TRUE;
    Settings.NoPatch=TRUE;
    Settings.HBlankStart=(256*Settings.H_Max)/SNES_HCOUNTER_MAX;
    GFX.RealPitch=GFX.Pitch=640;
    GFX.Screen=video.screen+640*16;GFX.SubScreen=video.sub+640*16;
    GFX.ZBuffer=video.depth+320*16;GFX.SubZBuffer=video.subdepth+320*16;
    GFX.Delta=(GFX.SubScreen-GFX.Screen)>>1;
    GFX.PPL=320;GFX.PPLx2=640;GFX.ZPitch=320;GFX.RenderRows=512;
    if(!Memory.Init()||!S9xGraphicsInit()){puts("SNES memory initialization failed");return 1;}
    if(!Memory.LoadROM("embedded.sfc")){puts("SNES cartridge rejected");Memory.Deinit();return 2;}
    Memory.LoadSRAM(TNS_SAVE_FILENAME);
    if(!lcd_init(SCR_320x240_565))return 3;
    IPPU.RenderThisFrame=TRUE;puts("SNES cartridge running");fflush(stdout);
    return 0;
}
#ifdef TNS_ROM_PREVIEW
unsigned tns_preview_keys;
unsigned TNS_ROM_SIZE;
const unsigned char *tns_rom_data;
extern "C" {
int tns_load(const unsigned char *data,unsigned size){tns_rom_data=data;TNS_ROM_SIZE=size;return initialize();}
void tns_step(unsigned keys){tns_preview_keys=keys;S9xMainLoop();}
unsigned short *tns_pixels(){return output;}
unsigned char *tns_save(){return Memory.SRAM;}
unsigned tns_save_size(){unsigned size=Memory.SRAMSize?1024u<<Memory.SRAMSize:0;return size>0x20000?0x20000:size;}
}
#else
int main() {
    int result=initialize();if(result)return result;
    while(!quit_requested&&!isKeyPressed(KEY_NSPIRE_ESC))S9xMainLoop();
    Memory.SaveSRAM(TNS_SAVE_FILENAME);
    S9xGraphicsDeinit();Memory.Deinit();
    printf("SNES saved and exited: %u frames\n",frames);return 0;
}
#endif
