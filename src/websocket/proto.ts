export interface IStandardResponse {
    ok: boolean,
    reason: string,
    code: number
}

export interface IStandardRequest {
    token: string
}


export interface IAuthRequest extends IStandardRequest{
}

export interface IAuthResponse extends IStandardResponse{
}

export interface IMessage {
    from: string,
    to: string,
    type: string,
    content: string,
    timestamp: string
}

