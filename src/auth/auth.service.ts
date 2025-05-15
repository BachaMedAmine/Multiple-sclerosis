import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signUp.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ResetCode } from './schema/reset-password.schema';
import { MailService } from 'src/service/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EditProfileDto } from './dto/edit-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Cron } from '@nestjs/schedule';
import * as admin from 'firebase-admin';
import { NotificationService } from 'src/notification/notification.service';
import * as appleSigninAuth from 'apple-signin-auth';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';


@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    @InjectModel(ResetCode.name)
    private ResetCodeModel: Model<ResetCode>,
    private mailService: MailService,
    private configService: ConfigService, 
    private readonly notificationService: NotificationService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );

  }

  async signUp(signUpDto: SignUpDto): Promise<{ user }> {
    const { fullName, email, birthday, password, gender, phone, profileCompleted, careGiverEmail, diagnosis, type, medicalReport, fcmToken, verified } = signUpDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const initializedProfileCompleted = profileCompleted ?? false;
    const hashedPassword = await bcrypt.hash(password, 10);
    const initializedType = type ?? false;
    const initializedBirthday = birthday ?? new Date('2000-02-20');
    const initializedPhone = phone ?? 10000000;
    const initializedCareGiverEmail = careGiverEmail ?? '';
    const initializedDiagnosis = diagnosis ?? '';
    const initializedFcmToken = fcmToken ?? "";
    const initializedVerified = verified ?? false;

    const user = await this.userModel.create({
      fullName,
      email,
      birthday: initializedBirthday,
      password: hashedPassword,
      gender: gender ? 'male' : 'female',
      phone: initializedPhone,
      profileCompleted: initializedProfileCompleted,
      careGiverEmail: initializedCareGiverEmail,
      diagnosis: initializedDiagnosis,
      type: initializedType,
      medicalReport,
      fcmToken: "",
      verified: initializedVerified
    });

    return { user };
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
        userId: user.id.toString(),
        fullName: user.fullName,
        email: user.email,
        gender: user.gender,
        birthday: user.birthday,
    };

    // Use consistent expiration time (1d as configured in module)
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(32).toString('hex');
    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
}
async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await this.userModel.findOne({ refreshToken }).exec();
  if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
  }

  const payload = {
      userId: user.id.toString(),
      fullName: user.fullName,
      email: user.email,
      gender: user.gender,
      birthday: user.birthday,
  };

  const newAccessToken = this.jwtService.sign(payload); // Will use the 1d expiration
  const newRefreshToken = randomBytes(32).toString('hex');
  
  user.refreshToken = newRefreshToken;
  await user.save();

  return { 
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
  };
}
  async validateGoogleUser(googleUser: any): Promise<any> {
    const { email, fullName, gender, birthday, googleId, accessToken, refreshToken } = googleUser;
  
    let user = await this.userModel.findOne({ email }) || await this.userModel.findOne({ googleId });
  
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        await user.save();
      }
      return user;
    }
  
    // Generate a random password for the Google user
    const randomPassword = randomBytes(16).toString('hex'); // 32-character hex string
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
  
    const newUser = await this.userModel.create({
      fullName,
      email,
      password: hashedPassword, // Store the hashed random password
      gender,
      birthday,
      googleId,
      accessToken,
      refreshToken,
      profileCompleted: false,
      phone: 10000000,
      careGiverEmail: '',
      diagnosis: '',
      type: false,
      medicalReport: '',
    });
  
    
  
    return newUser;
  }

  async validateGoogleToken(token: string): Promise<any> {
    try {
      const audienceList = [
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
        '815846323450-svco4e1a2u5gutrp1ifhdqf2s7v2fk5s.apps.googleusercontent.com',
        '815846323450-55fto74973fqkcfsaq9ajhfgkqkr8402.apps.googleusercontent.com',
      ].filter(Boolean) as string[];
 
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: audienceList,
      });
 
      const payload = ticket.getPayload();
 
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }
 
      const { email, name, sub: googleId } = payload;
      const user = {
        email,
        fullName: name,
        googleId,
        gender: '',
        birthday: new Date('2000-02-20'),
        accessToken: token,
      };
 
      return this.validateGoogleUser(user);
    } catch (error) {
      console.error('Google token validation error:', error);
      throw new UnauthorizedException('Google token validation failed');
    }
  }
 
  async googleLogin(user: any): Promise<{ payload, token: string }> {
    const payload = {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      gender: user.gender,
      birthday: user.birthday,
      phone: user.phone,
      careGiverEmail: user.careGiverEmail,
      diagnosis: user.diagnosis,
      medicalReport: user.medicalReport
    };

    const token = this.jwtService.sign(payload, { expiresIn: '5m' });

    return { payload, token };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new UnauthorizedException("Invalid Email.");

    const resetCode = Math.floor(100000 + Math.random() * 900000);
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getMinutes() + 100);

    await this.ResetCodeModel.create({
      codeNumber: resetCode,
      userId: user._id,
      expiryDate,
    });

    await this.mailService.sendPasswordResetEmail(email, resetCode);

    return { message: "Reset code sent to your email.", state: "success" };
  }

  async getResetCodeByEmail(email: string): Promise<ResetCode> {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const resetCode = await this.ResetCodeModel.findOne({
      userId: user._id,
      expiryDate: { $gt: new Date() }
    });

    if (!resetCode) throw new NotFoundException('Code not found or expired');
    return resetCode;
  }

  async verifyResetCode(email: string, resetCode: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const codeRecord = await this.ResetCodeModel.findOne({
      userId: user._id,
      codeNumber: resetCode,
      expiryDate: { $gt: new Date() }
    });

    return !!codeRecord;
  }

  async changePassword(email: string, changePasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userModel.updateOne({ email }, { password: hashedPassword });
  }

  async getProfile(user: any) {
    const foundUser = await this.userModel.findById(user.userId);
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    const { password, ...safeUser } = foundUser.toObject();

    return safeUser;
  }

  async updateProfile(id: string, editProfileDto: EditProfileDto): Promise<{ user }> {
    const {
      newName,
      newEmail,
      newBirthday,
      newGender,
      newPhone,
      newCareGiverEmail,
      newCareGiverPhone,
      newCareGiverName,
      newType,
      newDiagnosis,
      newMedicalReport,
    } = editProfileDto;
  
    const findUser = await this.userModel.findById(id);
  
    if (!findUser) {
      throw new NotFoundException('User not found');
    }
  
    // Check if email is being updated and already exists
    if (newEmail && newEmail !== findUser.email) {
      const existingUser = await this.userModel.findOne({ email: newEmail });
      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }
  
    // Build update data, including newName even if it's the same
    const updateData: any = {};
  
    if (newName) updateData.fullName = newName;
    if (newEmail) updateData.email = newEmail;
    if (newBirthday) updateData.birthday = newBirthday;
    if (newGender) updateData.gender = newGender;
    if (newPhone) updateData.phone = newPhone;
    if (newCareGiverEmail) updateData.careGiverEmail = newCareGiverEmail;
    if (newCareGiverPhone) updateData.careGiverPhone = newCareGiverPhone;
    if (newCareGiverName) updateData.careGiverName = newCareGiverName;
    if (newDiagnosis) updateData.diagnosis = newDiagnosis;
    if (newType) updateData.type = newType;
    if (newMedicalReport) updateData.medicalReport = newMedicalReport;
  
    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }
  
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { new: true }
      )
      .lean();
  
    if (updatedUser) {
      delete updatedUser.password;
      delete updatedUser.refreshToken;
    }
  
    return { user: updatedUser };
  } 
  async updatePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<{ user }> {
    const { oldPassword, newPassword } = changePasswordDto;

    const findUser = await this.userModel.findById(id);
    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    //Compare passwords
    const passwordMatch = await bcrypt.compare(oldPassword, findUser.password)
    if (!passwordMatch) {
      throw new NotFoundException('Check your current password');
    }

    //Create new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    findUser.password = newHashedPassword;

    await findUser.save()
    const userAfterPasswordUpdate = await this.userModel.findById(id)
    return { user: userAfterPasswordUpdate };

  }

  async deleteProfile(id: string): Promise<{ message: string }> {
    const findUser = await this.userModel.findById(id);
    if (!findUser) {
      throw new NotFoundException('User not found');
    }
    await findUser.deleteOne()
    return { message: "Profile has been deleted !" };
  }
  async getAllUsersWithFcmToken(): Promise<User[]> {
    return this.userModel.find({ fcmToken: { $exists: true, $ne: null } }).lean();
  }
  
  //Notification Quiz
//@Cron('0 0 * * 1') Every monday at midnight 00:00
@Cron('0 * * * * *')// Every minute
  async sendWeeklyQuizReminder() {
    const users = await this.userModel.find({ fcmToken: { $exists: true, $ne: "" } }).lean();

    for (const user of users) {
      if (user.fcmToken) {
        await this.sendNotification(user.fcmToken);
        await this.notificationService.addNotification({ title: "🔓 Quiz Open", message: `Weekly Quiz is open. Don't forget to pass it !` }, user._id.toString());
      }
    }
  }

  async sendNotification(fcmToken: string) {
    const message = {
      notification: {
        title: "🔓 Quiz Open",
        body: `Weekly Quiz is open. Don't forget to pass it !`,
      },
      data: {
        screen: 'HealthTrack'
      },
      android: {
        notification: {
          icon: 'ms_logo',
        }
      },
      token: fcmToken
    };
    try {
      await admin.messaging().send(message);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  async updateFcmToken(fullName: string, fcmToken: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ fullName });
    if (!user) {
      throw new NotFoundException("User not found!");
    }
    await this.userModel.updateOne({ fullName }, { $set: { fcmToken } });
    return { message: "FCM Token updated successfully!" };
  }

  async updateFcmTokenByEmail(email: string, fcmToken: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException("User not found!");
    }
    await this.userModel.updateOne({ email }, { $set: { fcmToken } });
    return { message: "FCM Token updated successfully!" };
  }

  //Email Verification
  async verifyEmail(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new UnauthorizedException("Invalid Email.");

    const resetCode = Math.floor(100000 + Math.random() * 900000);
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getMinutes() + 100);

    await this.ResetCodeModel.create({
      codeNumber: resetCode,
      userId: user._id,
      expiryDate,
    });

    await this.mailService.sendEmailVerification(user.fullName, user.email, resetCode);

    return { message: "Reset code sent to your email.", state: "success" };
  }

  async verifyEmailCode(email: string, resetCode: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const codeRecord = await this.ResetCodeModel.findOne({
      userId: user._id,
      codeNumber: resetCode,
      expiryDate: { $gt: new Date() }
    });

    user.verified = true;
    await user.save();

    return !!codeRecord;
  }

  async getUserIdByAuthId(authId: string): Promise<{ userId: string }> {
    const auth = await this.userModel.findById(authId);
    if (!auth) {
      throw new NotFoundException('User not found');
    }
    return { userId: auth.id.toString() };
  }

  async getMyUserId(loggedInUserId: string): Promise<{ user }> {
    const user = await this.userModel.findOne({ _id: loggedInUserId }).select('_id');
    if (!user) {
      throw new NotFoundException('user not found for the logged-in user');
    }
    return { user: user.id.toString() };
  }

  async validateAppleToken(identityToken: string): Promise<any> {
    try {
      const clientId = 'com.meriemabid.pim';
      const teamId = 'G96V29LG5G';
      const keyId = 'NB325ZFBJH';
  
      
      const privateKeyPath = path.join(__dirname, 'AuthKey_NB325ZFBJH.p8');
      const keyPath = this.configService.get<string>('APPLE_KEY_PATH');
if (!keyPath) {
  throw new Error('❌ APPLE_KEY_PATH is not defined in .env');
}
const privateKey = fs.readFileSync(keyPath, 'utf8');
      console.log("📁 Looking for Apple key at:", privateKeyPath);
      if (!clientId || !teamId || !keyId || !privateKey) {
        throw new Error(`Missing Apple configuration values.`);
      }
  
      // Optional test to verify JWT signing works (debug only)
      try {
        const testJwt = jwt.sign(
          { sub: 'test-user' },
          privateKey,
          {
            algorithm: 'ES256',
            expiresIn: '1h',
            keyid: keyId,
            issuer: teamId,
            audience: clientId,
          }
        );
        console.log("✅ JWT test succeeded:", testJwt.slice(0, 30), '...');
      } catch (err) {
        console.error("❌ JWT sign error:", err.message);
      }
  
      const clientSecret = appleSigninAuth.getClientSecret({
        clientID: clientId,
        teamID: teamId,
        keyIdentifier: keyId,
        privateKey,
      });
  
      const applePayload = await appleSigninAuth.verifyIdToken(identityToken, {
        audience: clientId,
        ignoreExpiration: false,
        clientSecret,
      });
  
      const { email, sub } = applePayload;
      let user = await this.userModel.findOne({ email }) || await this.userModel.findOne({ appleId: sub });
  
      if (!user) {
        const derivedName = email?.split('@')[0] || 'User';
        const fullName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
        const hashedPassword = await bcrypt.hash(randomBytes(16).toString('hex'), 10);
  
        user = await this.userModel.create({
          email,
          appleId: sub,
          fullName,
          password: hashedPassword,
          profileCompleted: false,
        });
      }
  
      return user;
    } catch (err) {
      console.error('Apple token verification failed:', err.message);
      throw new UnauthorizedException(`Apple login failed: ${err.message}`);
    }
  }
  
  async appleLogin(user: any): Promise<{ payload, token: string }> {
  const payload = {
  userId: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  };
  const token = this.jwtService.sign(payload, { expiresIn: '1d' });
  return { payload, token };
  }


  }
  




