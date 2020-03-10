export interface IStandardResponse {
    ok: boolean,
    reason: string,
    code: number
}

export interface IStandardRequest {
    token: string
    login_id: string
}


export interface IAuthRequest extends IStandardRequest{
}

export interface IAuthResponse extends IStandardResponse{
}