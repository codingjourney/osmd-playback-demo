# Singkreis
Demo available at [http://music.journey.sk/](http://music.journey.sk/) (sorry, no HTTPS yet).

## About

*Singkreis* is a somewhat archaic German word for a small choir, usually consisting of amateur singers. This application is intended to help choir members practice their repertoire outside choir practice sessions. It displays a score and plays back its notes. The user can configure individual voices, as well as set tempo, playback range and turn loop mode on/off.

This work is based on [Jimmy Utterström](https://jimmyutterstrom.com/)'s [proof of concept](https://github.com/jimutt/osmd-playback-demo) application enabling audio playback for [OSMD](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) scores (Jimmy is now working on a [more polished player](https://github.com/jimutt/osmd-audio-player)).

## Limitations

At its current state the interpretation of the score is very basic - dynamics, grace notes and even repetitions are ignored. As for bugs, the cursor basically doesn't work. There are also some issues with tie lengths.

## Implementation

The application is built with Vue.js and Vuetify. Run `npm run serve` to build the project and run it on a local dev server.
