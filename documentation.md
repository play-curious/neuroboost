# Tags

* `show:[character]`
> Display a character at the start of the node

* `bg:[background]`
> Change the background at the start of the node

# Dialog

## Mood

Change a characters mood when talking.
* Normal: `Fred: Hello`
* Mood(Happy): `Fred happy: Hello !!!!!!`

### List of moods

TODO Quentin

## Style

* Italic : `<i>`
> Fred: Bonjour \<i>Joueur\</i>...  
> Fred: Bonjour *Joueur*...

* Bold : `<b>`
> Fred: Bonjour \<b>Joueur\</b> !  
> Fred: Bonjour **Joueur** !

* Italic & Bold : `<bi>`
> Fred: Bonjour \<bi>Joueur\</bi> !..  
> Fred: Bonjour ***Joueur*** !..

# Commands

## Display

* `show [character]`
> Display a character. Replace the previous character if there was one.
> `<< show fred >>`
> `<< show temde >>`

* `changeBackground [background]`
> Change the background
> `<< changeBackground kitchen >>`

## Gauges

* `showGauges`
> Show all gauges

* `showGauges [gauge1], [gauge2]... `
> Show one or more gauges
> `<< showGauges sleep food >>`

* `hideGauges` Hide all gauges

* `hideGauges [gauge1], [gauge2]...`
> Hide one or more gauges
> `<< hideGauges sleep food >>`

* `setGauge [gauge] [value]`
> Set a gauge to value
> `<< setGauge sleep 100 >>`

* `addToGauge [gauge] [value]`
> Add value to a gauge
> `<< addToGauge sleep 15 >>`

* `removeFromGauge [gauge] [value]`
> Remove value to a gauge
> `<< removeToGauge sleep 15 >>`

***Fonction***
* `getGauge("[gauge]")`
> Get value from a gauge
> `<< if getGauge("sleep") < 50 >>`

## Sound Effects

* `fx [fx]`
> Play a sound ounce
> `<< fx Notification >>`

* `loopFX [fx] [n]`
> Loop a sound every n milliseconds
> `<< loopFX AlarmClock_LOOP 2000 >>`  
> This will play the AlarmClock_LOOP.mp3 fx, which is 2 seconds long, every 2 seconds. So it will just repeat right when it ends.

* `stopFX [fx]`
> Stop a sound being looped
> `<< stopFX AlarmClock_LOOP >>`

## Musics

* `music [music]`
> Play a music
> `<< music Neutral >>`

# Variables

## Characters

* azul
* fred
* ledai
* sapiens
* temde

## Backgrounds

* bedroom
* bedroom_night
* kitchen
* desk
* class
* party
* circle
* outside
* schema
* sport

## Gauges

* sleep
* food

## FXs

### Normal

* Bell_Meditation
* EatCook
* Notification
* Success
* Failure
* Teleportation

### Loop

* AlarmClock_LOOP
* PhoneRing_LOOP
* Sleep_LOOP
* Sports_LOOP
* TVStarwars_LOOP
* Work_LOOP

## Musics

* Mysterious
* NegativeSad
* Neutral
* Tense
* Victory