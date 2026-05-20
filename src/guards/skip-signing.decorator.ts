import { SetMetadata } from '@nestjs/common';
import { SKIP_SIGNING_KEY } from './request-signing.guard';

export const SkipSigning = () => SetMetadata(SKIP_SIGNING_KEY, true);
