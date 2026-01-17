# Audio Files for Voice Narration

Place your ElevenLabs generated audio files here.

## Required Files:

1. `step-1-knowledge-base.mp3`
2. `step-2-multi-channel.mp3`
3. `step-3-conversations.mp3`
4. `step-4-crm.mp3`
5. `step-5-appointments.mp3`
6. `step-6-analytics.mp3`

## Scripts to Generate:

See the file `/ELEVENLABS_SCRIPTS.md` in the root directory for all the narration texts.

## After adding the files:

Update `/src/components/landing/OnboardingAnimation.tsx` by replacing each `audioUrl: undefined` with the corresponding file path:

```typescript
audioUrl: '/audio/step-1-knowledge-base.mp3'
```
