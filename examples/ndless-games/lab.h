/* Original preview stress games. MIT license. */
#ifndef PREVIEW_GAME_LAB_H
#define PREVIEW_GAME_LAB_H
#include <os.h>
#include <SDL/SDL.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
static SDL_Surface *screen;
static nSDL_Font *font;
static unsigned tick=0;
static int init_game(void){if(SDL_Init(SDL_INIT_VIDEO)<0)return 0;screen=SDL_SetVideoMode(320,240,16,SDL_SWSURFACE);if(!screen)return 0;font=nSDL_LoadFont(NSDL_FONT_TINYTYPE,240,250,255);return font!=NULL;}
static Uint32 rgb(int r,int g,int b){return SDL_MapRGB(screen->format,r,g,b);}
static void box(int x,int y,int w,int h,Uint32 c){SDL_Rect r={x,y,w,h};SDL_FillRect(screen,&r,c);}
static void text(int x,int y,const char*s){nSDL_DrawString(screen,font,x,y,s);}
static void frame(void){SDL_Flip(screen);SDL_PumpEvents();tick++;}
static int key(const t_key*k){return isKeyPressed(*k);}
static void done(void){nSDL_FreeFont(font);SDL_Quit();}
#endif
