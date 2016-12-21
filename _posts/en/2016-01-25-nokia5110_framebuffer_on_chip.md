---
title: Nokia 5110 display on CHIP
name: nokia5110spichip
lang: en
abstract: For one of my projects I needed a small inexpensive display connected to CHIP, so I'm trying to connect the Nokia 5110 display via SPI bus as a framebuffer device and use it to display bitmaps and run ncurses console software.
---

# Hardware setup
The following equipment is used:

- [CHIP computer](http://getchip.com/ "NextThingCo, creator of CHIP"), Alpha v0x21
- [Nokia 5110 display unit](http://arduino-ua.com/prod407-Nokia5110_LCD_modyl "ARDUINO-UA shop")
- [Breadboard with 2 power lines](http://arduino-ua.com/prod361-Maketnaya_plata_bolshaya "ARDUINO-UA shop")
- [6.5-12V AC to 3.3/5V DC power supply unit](http://arduino-ua.com/prod287-Pitanie_dlya_maketnoi_plati_533V "ARDUINO-UA shop")
- [Jumper cables](http://arduino-ua.com/prod522-Nabor_peremichek_dlya_Arduino_40_sht "ARDUINO-UA shop")
- 100-240V to 9V switching adaptor, 1.2 A

## Display and wiring
Breadboard setup is quite trivial. The only quirk is that the display comes in innumerable
varieties and the connecting guides you might find on the Internet might deviate from your
actual device. In my setup I connected `VCC` to 3.3V power (+) and `GND` with `LIGHT` to
3.3V ground (-). Some devices apparently require you to connect `LIGHT` to (+) instead.

{% include figure.html url="IMG_20160125_121724.jpg" caption="Display connected and powered up" %}

## Connecting CHIP
CHIP is normally powered from μUSB cable providing at least 500 mAh of current. I have seen
the device randomly shut off when using long cables and power-intensive things like WiFi, so
I'm using both USB charge and external 5V source from breadboard. According to the [pinout][chippinout]
I connect power (+) to `CHG-IN` and ground (-) to `GND`, pins 2 and 4 on the `U13` header
respectively. In order not to trust the power supply in the assumption that 3.3V ground is same as 5.5V I'm
rewiring the power for display using CHIP's own power output ports. Therefore `LIGHT` with `GND`
go to `GND` while `VCC` goes to `VCC3V3` (`U13`, pins 1 and 5 respectively).

CHIP has [only SPI2 usable][spi2forum] and the pins are reused with CSI interface, so by
using SPI we are sacrificing camera interface. According to the [schematic][chipschema] the
SPI wiring is as follows: `CSIPCK` to `CE`, `CSICK` to `CLK`, `CSIHSYNC` to `DIN` (`U14` pins
27-29 respectively). CHIP's outputs are 3.3V, so it hopefully doesn't require the
use of level translation unit. If you are using another board which is 5V you might need one.

Now the display still has 2 spare inputs: `RST` which is used for resetting the device and
`DC` which is used for switching between command and data mode. They are outside of the general
SPI interface, so they must be connected to GPIO pins. Since we don't need particular speed, the
easiest option is to use `XIO` pins, so here it goes: `XIO-P0` to `RST`, `XIO-P1` to `DC` (`U14`
pins 13-14 respectively). Note the numbers, we'll need them later on.

[chippinout]: https://github.com/NextThingCo/CHIP-Hardware/blob/master/ALPHA-CHIP%5Bv0_21%5D/ALPHA%20CHIP%20v0_21%20PINOUT.png
[chipschema]: https://github.com/NextThingCo/CHIP-Hardware/blob/master/ALPHA-CHIP%5Bv0_21%5D/CHIP_ALPHA_V_021.pdf
[spi2forum]: https://bbs.nextthing.co/t/spi-master-support/1118/5

{% include figure.html url="IMG_20160125_142912.jpg" caption="Final wiring with CHIP" %}

# Software setup
Now that we have the wires in place we need to configure Linux to enable SPI and to use our display as
a framebuffer. The manual for firmware customization are covered in the [official documentation][chipsdk],
so I'm not repeating the basics from there. Alternatively can use your own cross compiler if you know
what that stands for and also not lazy.

[chipsdk]: http://docs.getchip.com/#flash-chip-firmware

## Kernel and device tree
Now we check all the needed kernel options. If your kernel already has `SPI`, `FB` and `GPIOLIB` set you can
just compile the `fbtft` module by @notro without full kernel build. In CHIP's kernel version it is included
under `drivers/staging`. Additionally the kernel uses a [device tree file][gpiomux] to learn about the hardware,
so we need to modify the file to reference the SPI2 support. You can refer to [this thread][dtsforum] for background.
The device tree can be compiled with `dtc` utility without the full kernel build too. For convenience I forked
`CHIP-linux` and just using re-using my repository and adding a custom `defconfig` file:

```
CHIP-buildroot$ make menuconfig
```

```
[*] Linux Kernel                              
  Kernel version (Custom Git repository)  --->   
  (https://github.com/landswellsong/CHIP-linux.git) URL of custom repository
  Kernel configuration (Using an in-tree defconfig file)  --->
  (chip_spi2_fbtft) Defconfig name
```

```
CHIP-buildroot$ make linux
```

Changes from the default kernel are:

- CHIP's configuration put under `arch/arm/configs/chip_spi2_fbtft_defconfig` and `FB_TFT` enabled as a module.
- @vmayoral's device tree [modifications][dts].

After your kernel is ready, grab the `zImage` with `sun5i-r8-chip.dtb` from `output/images` and `lib/modules`
from `output/target` then put it on the device into `/boot` and `/lib` respectively followed by reboot of CHIP.
Alternatively you can do a full flash as described in documentation. Logging into the new system you
should see the following in the log:

```
chip# dmesg
```

Before loading the module we need to know how the GPIO pins are named for the kernel. In my case `XIO-P0` is 408
and `XIO-P1` is 409. Send 0/1 values to them and check that you get 0/3.3V voltage between the respective pin and
`GND` just to verify. @jefflarkin made a handy [bash script][gpioforum] in case you are new to `/sys/class/gpio`.
After all the values are determined, we load the module into the kernel:

[gpiomux]: https://bbs.nextthing.co/t/muxing-chip-gpios/300/8
[dtsforum]: https://bbs.nextthing.co/t/get-several-spi-chip-selects/895
[dts]: https://github.com/landswellsong/CHIP-linux/commit/9400252965925d02de5b12996141b7f5b44ec9f1
[gpioforum]: https://bbs.nextthing.co/t/bash-interface-to-gpio/2144

## Framebuffer setup
