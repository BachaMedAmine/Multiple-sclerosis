import { Controller, Get, Post, Body, Param, UseGuards, Req, Res, UnauthorizedException, Put, NotFoundException, Request, UseInterceptors, UploadedFile, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verifyCode.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EditProfileDto } from './dto/edit-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileUploadService } from './fileUpload.service';
import { GoogleOAuthGuard } from './Google/google-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('auth')
export class AuthController {
  jwtService: any;
  constructor(
    private readonly authService: AuthService
  ) { }

  
  @Post('/signup')
  @UseInterceptors(FileInterceptor('contentFile', FileUploadService.multerOptions))
  signUp(@Body() SignUpDto: SignUpDto, @UploadedFile() file?: Express.Multer.File) {

    if (file) {
      let filePath = '';
      if (file.mimetype.startsWith('image/')) {
        filePath = `uploads/images/${file.filename}`;
      } else {
        filePath = `uploads/documents/${file.filename}`;
      }
      SignUpDto.medicalReport = filePath;
    } else {
      SignUpDto.medicalReport = "";
    }

    return this.authService.signUp(SignUpDto);
  }

  @Post('login')
async login(@Body() loginDto: LoginDto, @Res() res) {
  const { accessToken, refreshToken } = await this.authService.login(loginDto.email, loginDto.password);
  res.setHeader('Authorization', `Bearer ${accessToken}`);
  res.json({ token: accessToken, refreshToken });
}

@Post('refresh-token')
async refreshToken(@Body() body: { refreshToken: string }) {
  return this.authService.refreshToken(body.refreshToken);
}

  @Post('/forgot-password')
  forgotPassword(@Body() forgotPassword: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPassword.email)
  }

  @Post('/get-reset-code/:email')
  async getResetCode(@Param('email') email: string) {
    const resetCode = await this.authService.getResetCodeByEmail(email);
    if (!resetCode) {
      throw new NotFoundException('Code not found');
    }
    return { codeNumber: resetCode.codeNumber.toString() };
  }

  @Post('/verify-reset-code')
  async verifyResetCode(@Body() verifyCodeDto: VerifyCodeDto) {
    const { email, resetCode } = verifyCodeDto;
    const validCode = await this.authService.verifyResetCode(email, resetCode);
    if (!validCode) throw new NotFoundException('Invalid or expired code');
    return { message: 'Code verified successfully' };
  }

  @Put('reset-password/:email')
  async resetPassword(@Param('email') email: string, @Body() changePasswordDto: ResetPasswordDto): Promise<void> {
    return this.authService.changePassword(email, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update-profile')
  @UsePipes(new ValidationPipe({ transform: true })) 
  @UseInterceptors(FileInterceptor('newMedicalReport', FileUploadService.multerOptions))
  async updateProfile(@Request() req, @Body() editProfileDto: EditProfileDto, @UploadedFile() file?: Express.Multer.File): Promise<{ user }> {
    if (file) {
      let filePath = '';
      if (file.mimetype.startsWith('image/')) {
        filePath = `uploads/images/${file.filename}`;
      } else {
        filePath = `uploads/documents/${file.filename}`;
      }
      editProfileDto.newMedicalReport = filePath;
    }
    const userId = req.user.userId;
    return this.authService.updateProfile(userId, editProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto): Promise<{ user }> {
    const userId = req.user.userId;
    return this.authService.updatePassword(userId, changePasswordDto);
  }

    @UseGuards(JwtAuthGuard)
    @Delete('delete-profile')
    async deleteProfile(@Request() req): Promise<{ message: string }> {
      const userId = req.user.userId;
      return this.authService.deleteProfile(userId);
    }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth(@Req() req) {
    // This endpoint initiates Google authentication
    return { message: 'Google authentication initiated' };
  }

  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res) {
    if (!req.user) {
      throw new UnauthorizedException('Google authentication failed');
    }

    const { payload, token } = await this.authService.googleLogin(req.user);
    res.setHeader('Authorization', `Bearer ${token}`);
    res.redirect(`http://localhost:3000?token=${token}`); // Redirect to your frontend with the token
  }

  @Post('google/login')
async googleMobileLogin(@Body() body: { token: string }, @Res() res) {
  const { token } = body;

  if (!token) {
    throw new UnauthorizedException('Google token is required');
  }

  const user = await this.authService.validateGoogleToken(token);
  const { payload, token: jwtToken, refreshToken } = await this.authService.googleLogin(user);

  res.setHeader('Authorization', `Bearer ${jwtToken}`);
    res.json({ token: jwtToken, refreshToken });
}

@Put('updateFcmToken')
  async updateFcmToken(@Body() body: { fullName: string, fcmToken: string }) {
    return this.authService.updateFcmToken(body.fullName, body.fcmToken);
  }

  @Put('updateFcmTokenByEmail')
  async updateFcmTokenByEmail(@Body() body: { email: string, fcmToken: string }) {
    return this.authService.updateFcmTokenByEmail(body.email, body.fcmToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getUserId/:authId')
  async getUserIdByAuthId(@Param('authId') authId: string) {
    return this.authService.getUserIdByAuthId(authId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getMyUserId')
  async getMyUserId(@Request() req) {
    return this.authService.getMyUserId(req.user.userId);
  }

  @Post('apple-login')
  async appleLogin(@Body('identityToken') identityToken: string) {
    const user = await this.authService.validateAppleToken(identityToken);
    return this.authService.appleLogin(user);
  }

  //verify email
  @Post('/verify-email-code')
  async verifyEmailCode(@Body() verifyCodeDto: VerifyCodeDto) {
    const { email, resetCode } = verifyCodeDto;
    const validCode = await this.authService.verifyEmailCode(email, resetCode);
    if (!validCode) throw new NotFoundException('Invalid or expired code');
    return { message: 'Code verified successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('/verify-email')
  verifyEmail(@Request() req) {
    const userId = req.user.userId;
    return this.authService.verifyEmail(userId)
  }
}
